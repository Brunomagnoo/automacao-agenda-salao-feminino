import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const BRAZIL_PHONE_REGEX = /^([1-9]{1}[1-9]{1})(9\d{8}|\d{8})$/;

const CreateAppointmentSchema = z.object({
  serviceIds: z.array(z.string().min(1)).min(1),
  timeSlotId: z.string().min(1),
  // totalEstimated and totalDurationMin from client are IGNORED — recalculated server-side
  name: z.string().min(2).max(100).optional(),
  phone: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
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

    const { serviceIds, timeSlotId, name, phone } = parseResult.data;

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

      // Check if user exists by phone (upsert by phone to avoid race conditions)
      const existingUser = await prisma.user.findUnique({ where: { phone: cleanPhone } });

      if (existingUser) {
        finalUserId = existingUser.id;
        userExistedBefore = true;
      } else {
        // Create new guest user with cryptographically secure random password
        const { hash } = await import('bcryptjs');
        const randomPassword = randomBytes(16).toString('hex');
        const passwordHash = await hash(randomPassword, 10);

        // B-01: Generate uniqueCode from cuid after creation to avoid race condition
        const newUser = await prisma.user.create({
          data: {
            name,
            phone: cleanPhone,
            passwordHash,
            uniqueCode: `TEMP-${randomBytes(4).toString('hex')}`, // temporary placeholder
            role: 'CLIENT',
          },
        });

        // Update uniqueCode using the stable DB-generated id (no race condition)
        const finalUser = await prisma.user.update({
          where: { id: newUser.id },
          data: { uniqueCode: `BS-${newUser.id.slice(-6).toUpperCase()}` },
        });

        finalUserId = finalUser.id;
        userExistedBefore = false;
      }
    }

    if (!finalUserId) {
      return NextResponse.json(
        { error: 'INTERNAL_ERROR', message: 'Falha ao identificar usuário' },
        { status: 500 },
      );
    }

    // S-09: Recalculate price and duration from DB — never trust client values
    const dbServices = await prisma.service.findMany({
      where: { id: { in: serviceIds }, isActive: true },
    });

    if (dbServices.length !== serviceIds.length) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Um ou mais serviços não encontrados ou inativos.' },
        { status: 400 },
      );
    }

    const totalEstimated = dbServices.reduce((sum, svc) => sum + svc.basePrice, 0);
    const totalDurationMin = dbServices.reduce((sum, svc) => sum + svc.durationMin, 0);

    // S-02: All slot checks and booking happen inside a single transaction (fixes TOCTOU race condition)
    const appointment = await prisma.$transaction(async (tx) => {
      // Verify the slot exists and is available INSIDE the transaction
      const slot = await tx.timeSlot.findUnique({ where: { id: timeSlotId } });

      if (!slot) {
        throw new Error('SLOT_NOT_FOUND');
      }
      if (!slot.isAvailable) {
        throw new Error('SLOT_UNAVAILABLE');
      }

      // Parse start time to minutes
      const [startH, startM] = slot.startTime.split(':').map(Number);
      const startMin = startH * 60 + startM;
      const endMin = startMin + totalDurationMin;

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

      return { appointment: newAppointment, slot };
    });

    // Send email notification (outside transaction — non-critical)
    try {
      const { sendAppointmentNotification } = await import('@/lib/email');
      const { formatDate } = await import('@/lib/utils');
      const dbUser = await prisma.user.findUnique({ where: { id: finalUserId! } });
      if (dbUser) {
        await sendAppointmentNotification({
          clientName: dbUser.name,
          clientPhone: dbUser.phone,
          services: dbServices.map((s) => s.name),
          date: formatDate(appointment.slot.date.toISOString()),
          startTime: appointment.slot.startTime,
          totalEstimated,
        });
      }
    } catch (err) {
      console.error('[Appointments] Email falhou, mas agendamento foi criado:', err instanceof Error ? err.message : '');
    }

    // L-08: Return only necessary fields + userExistedBefore (used for nudge only)
    return NextResponse.json(
      { id: appointment.appointment.id, status: appointment.appointment.status, userExistedBefore },
      { status: 201 },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : '';
    if (msg === 'SLOT_NOT_FOUND') {
      return NextResponse.json({ error: 'SLOT_NOT_FOUND', message: 'Horário não encontrado' }, { status: 404 });
    }
    if (msg === 'SLOT_UNAVAILABLE') {
      return NextResponse.json({ error: 'SLOT_UNAVAILABLE', message: 'Horário não está mais disponível' }, { status: 409 });
    }
    console.error('[Appointments] Erro ao criar agendamento:', msg);
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
      take: 100,
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
    console.error('[Appointments] Erro ao buscar agendamentos:', error instanceof Error ? error.message : '');
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao buscar agendamentos' },
      { status: 500 },
    );
  }
}
