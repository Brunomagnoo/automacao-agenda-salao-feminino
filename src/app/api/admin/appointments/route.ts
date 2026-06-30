import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    const where = date ? { timeSlot: { date: new Date(date) } } : {};

    const appointments = await prisma.appointment.findMany({
      where,
      take: 100, // UX/Perf fix: prevent memory leaks
      include: {
        user: {
          select: {
            id: true,
            uniqueCode: true,
            name: true,
            phone: true,
            role: true,
          },
        },
        services: {
          include: { service: true },
        },
        timeSlot: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error(
      '[AdminAPI] Erro interno ao buscar agendamentos.',
      error instanceof Error ? error.message : '',
    );
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao buscar agendamentos' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Data é obrigatória' },
        { status: 400 },
      );
    }

    // Find appointments to delete so we can free up their timeslots
    const targetDate = new Date(date);
    const appointmentsToDelete = await prisma.appointment.findMany({
      where: { timeSlot: { date: targetDate } },
      include: { timeSlot: true },
    });

    if (appointmentsToDelete.length === 0) {
      return NextResponse.json({ deleted: 0 });
    }

    // Free up timeslots
    const slotIds = appointmentsToDelete.map((a) => a.timeSlotId);
    if (slotIds.length > 0) {
      await prisma.timeSlot.updateMany({
        where: { id: { in: slotIds } },
        data: { isAvailable: true },
      });
    }

    // Delete appointments
    const { count } = await prisma.appointment.deleteMany({
      where: { timeSlot: { date: targetDate } },
    });

    return NextResponse.json({ deleted: count });
  } catch (error) {
    console.error('Error deleting appointments:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao deletar agendamentos' },
      { status: 500 },
    );
  }
}
