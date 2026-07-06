import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const PatchAppointmentSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']).optional(),
  totalFinal: z.number().nonnegative().optional(),
  expenses: z.number().nonnegative().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Acesso negado' }, { status: 403 });
    }

    const { id } = await params;
    const rawBody = await request.json();

    // S-07: Validate with Zod — no unvalidated enum values accepted
    const parseResult = PatchAppointmentSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Dados inválidos', details: parseResult.error.format() },
        { status: 400 },
      );
    }

    const { status, totalFinal, expenses } = parseResult.data;

    // B-03: If cancelling, only unblock slots that are NOT used by other active appointments
    if (status === 'CANCELLED') {
      const appointment = await prisma.appointment.findUnique({
        where: { id },
        include: { timeSlot: true },
      });

      if (!appointment) {
        return NextResponse.json(
          { error: 'NOT_FOUND', message: 'Agendamento não encontrado' },
          { status: 404 },
        );
      }

      const [startH, startM] = appointment.timeSlot.startTime.split(':').map(Number);
      const startMin = startH * 60 + startM;
      const endMin = startMin + appointment.totalDurationMin;

      // Find all slots on the same date that fall within the appointment window
      const slotsOnDate = await prisma.timeSlot.findMany({
        where: { date: appointment.timeSlot.date },
      });

      const candidateSlotIds = slotsOnDate
        .filter((s) => {
          const [h, m] = s.startTime.split(':').map(Number);
          const sMin = h * 60 + m;
          return sMin >= startMin && sMin < endMin;
        })
        .map((s) => s.id);

      // B-03 FIX: Only unblock slots that are NOT linked to another active appointment
      const slotsToUnblock: string[] = [];
      for (const slotId of candidateSlotIds) {
        const otherActiveAppointments = await prisma.appointment.count({
          where: {
            timeSlotId: slotId,
            status: { notIn: ['CANCELLED'] },
            id: { not: id }, // exclude current appointment being cancelled
          },
        });
        if (otherActiveAppointments === 0) {
          slotsToUnblock.push(slotId);
        }
      }

      if (slotsToUnblock.length > 0) {
        await prisma.timeSlot.updateMany({
          where: { id: { in: slotsToUnblock } },
          data: { isAvailable: true },
        });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (totalFinal !== undefined) updateData.totalFinal = totalFinal;
    if (expenses !== undefined) updateData.expenses = expenses;

    const updated = await prisma.appointment.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[AppointmentPatchAPI] Erro:', error instanceof Error ? error.message : '');
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao atualizar agendamento' },
      { status: 500 },
    );
  }
}
