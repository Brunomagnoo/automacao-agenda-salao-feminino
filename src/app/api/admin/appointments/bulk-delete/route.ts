import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const BulkDeleteSchema = z.object({
  appointmentIds: z.array(z.string()).min(1),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Acesso negado' }, { status: 403 });
    }

    const rawBody = await request.json();
    const parseResult = BulkDeleteSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Dados inválidos' },
        { status: 400 },
      );
    }

    const { appointmentIds } = parseResult.data;

    // We do not use a single huge transaction to avoid locking tables for too long
    // Instead, we safely unblock slots first, then delete.
    const appointments = await prisma.appointment.findMany({
      where: { id: { in: appointmentIds } },
      include: { timeSlot: true },
    });

    if (appointments.length === 0) {
      return NextResponse.json({ deleted: 0 });
    }

    const slotsToUnblock = new Set<string>();

    for (const appointment of appointments) {
      const [startH, startM] = appointment.timeSlot.startTime.split(':').map(Number);
      const startMin = startH * 60 + startM;
      const endMin = startMin + appointment.totalDurationMin;

      // Find all slots on the same date
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

      for (const slotId of candidateSlotIds) {
        // Only unblock if NO OTHER active appointment (that is NOT in the deletion list) is using this slot
        const otherActiveAppointments = await prisma.appointment.count({
          where: {
            timeSlotId: slotId,
            status: { notIn: ['CANCELLED'] },
            id: { notIn: appointmentIds },
          },
        });
        if (otherActiveAppointments === 0) {
          slotsToUnblock.add(slotId);
        }
      }
    }

    // Unblock slots
    if (slotsToUnblock.size > 0) {
      await prisma.timeSlot.updateMany({
        where: { id: { in: Array.from(slotsToUnblock) } },
        data: { isAvailable: true },
      });
    }

    // Delete related AppointmentServices to satisfy FK constraints
    await prisma.appointmentService.deleteMany({
      where: { appointmentId: { in: appointmentIds } },
    });

    // Delete Appointments
    const deleteResult = await prisma.appointment.deleteMany({
      where: { id: { in: appointmentIds } },
    });

    return NextResponse.json({ deleted: deleteResult.count });
  } catch (error) {
    console.error('[AdminBulkDeleteAPI] Erro ao deletar agendamentos:', error instanceof Error ? error.message : '');
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao deletar agendamentos' },
      { status: 500 },
    );
  }
}
