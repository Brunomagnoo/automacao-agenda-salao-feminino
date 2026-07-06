import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const BRAZIL_PHONE_REGEX = /^([1-9]{1}[1-9]{1})(9\d{8}|\d{8})$/;

const CreateAppointmentSchema = z.object({
  serviceIds: z.array(z.string().min(1)).min(1),
  timeSlotId: z.string().min(1),
  totalEstimated: z.number().nonnegative(),
  totalDurationMin: z.number().int().positive(),
  name: z.string().optional(),
  phone: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    let user = await getCurrentUser();
    let finalUserId = user?.userId;
    let userExistedBefore = false;

    const rawBody = await request.json();
    const parseResult = CreateAppointmentSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Dados inválidos ou malformados' },
        { status: 400 },
      );
    }

    const { serviceIds, timeSlotId, totalEstimated, totalDurationMin, name, phone } = parseResult.data;

    // If no logged in user, require name and phone
    if (!user) {
      if (!name || !phone) {
        return NextResponse.json(
          { error: 'UNAUTHORIZED', message: 'Faça login ou informe Nome e WhatsApp para agendar.' },
          { status: 401 },
        );
      }

      const cleanPhone = phone.replace(/\D/g, '').replace(/^55/, '');
      if (!BRAZIL_PHONE_REGEX.test(cleanPhone)) {
        return NextResponse.json(
          { error: 'BAD_REQUEST', message: 'Número de WhatsApp inválido.' },
          { status: 400 },
        );
      }

      // Check if user exists by phone
      let existingUser = await prisma.user.findUnique({
        where: { phone: cleanPhone }
      });

      if (existingUser) {
        finalUserId = existingUser.id;
        userExistedBefore = true;
      } else {
        // Create new guest user
        const { hash } = await import('bcryptjs');
        const randomPassword = Math.random().toString(36).slice(-10);
        const passwordHash = await hash(randomPassword, 10);
        
        const userCount = await prisma.user.count();
        const uniqueCode = 'BS-' + String(userCount + 1).padStart(4, '0');

        const newUser = await prisma.user.create({
          data: {
            name,
            phone: cleanPhone,
            passwordHash,
            uniqueCode,
            role: 'CLIENT'
          }
        });
        finalUserId = newUser.id;
        userExistedBefore = false;
      }
    }

    if (!finalUserId) {
      return NextResponse.json(
        { error: 'INTERNAL_ERROR', message: 'Falha ao identificar usuário' },
        { status: 500 },
      );
    }

    // Verify the slot exists and is available
    const slot = await prisma.timeSlot.findUnique({
      where: { id: timeSlotId },
    });

    if (!slot) {
      return NextResponse.json(
        { error: 'SLOT_NOT_FOUND', message: 'Horário não encontrado' },
        { status: 404 },
      );
    }

    if (!slot.isAvailable) {
      return NextResponse.json(
        { error: 'SLOT_UNAVAILABLE', message: 'Horário não está disponível' },
        { status: 409 },
      );
    }

    // Parse start time to minutes
    const [startH, startM] = slot.startTime.split(':').map(Number);
    const startMin = startH * 60 + startM;
    const endMin = startMin + totalDurationMin;

    // Create appointment in a transaction
    const appointment = await prisma.$transaction(async (tx) => {
      // 1. Create the appointment
      const newAppointment = await tx.appointment.create({
        data: {
          userId: finalUserId!,
          timeSlotId,
          totalEstimated,
          totalDurationMin,
          status: 'PENDING',
        },
      });

      // 2. Create AppointmentService for each service
      await tx.appointmentService.createMany({
        data: serviceIds.map((serviceId: string) => ({
          appointmentId: newAppointment.id,
          serviceId,
        })),
      });

      // 3. Mark the selected time slot as unavailable
      await tx.timeSlot.update({
        where: { id: timeSlotId },
        data: { isAvailable: false },
      });

      // 4. Block conflicting slots on the same date
      const allSlotsOnDate = await tx.timeSlot.findMany({
        where: { date: slot.date },
      });

      const conflictingSlotIds = allSlotsOnDate
        .filter((s) => {
          const [h, m] = s.startTime.split(':').map(Number);
          const sMin = h * 60 + m;
          return sMin >= startMin && sMin < endMin && s.id !== timeSlotId;
        })
        .map((s) => s.id);

      if (conflictingSlotIds.length > 0) {
        await tx.timeSlot.updateMany({
          where: { id: { in: conflictingSlotIds } },
          data: { isAvailable: false },
        });
      }

      return newAppointment;
    });

    // Fetch service names for email
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
    });

    // Import and call email notification
    const { sendAppointmentNotification } = await import('@/lib/email');
    const { formatDate } = await import('@/lib/utils');

    // Get the user data from DB to get the name and phone
    const dbUser = await prisma.user.findUnique({ where: { id: finalUserId! } });

    if (dbUser) {
      // Await email to prevent memory leaks and Vercel background task termination
      try {
        await sendAppointmentNotification({
          clientName: dbUser.name,
          clientPhone: dbUser.phone,
          services: services.map((s) => s.name),
          date: formatDate(slot.date.toISOString()),
          startTime: slot.startTime,
          totalEstimated,
        });
      } catch (err) {
        console.error('Email failed to send, but appointment was created:', err);
      }
    }

    return NextResponse.json({ ...appointment, userExistedBefore }, { status: 201 });
  } catch (error) {
    console.error('Error creating appointment:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao criar agendamento' },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Não autenticado' },
        { status: 401 },
      );
    }

    const appointments = await prisma.appointment.findMany({
      where: { userId: user.userId },
      take: 100, // UX/Perf fix: prevent memory leaks with unbounded queries
      include: {
        services: {
          include: { service: true },
        },
        timeSlot: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao buscar agendamentos' },
      { status: 500 },
    );
  }
}
