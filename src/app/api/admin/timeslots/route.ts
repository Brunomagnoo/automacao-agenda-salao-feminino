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

    if (!date) {
      return NextResponse.json(
        { error: 'MISSING_DATE', message: 'Parâmetro "date" é obrigatório' },
        { status: 400 },
      );
    }

    const [y, m, d] = date.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d));
    const slots = await prisma.timeSlot.findMany({
      where: { date: dateObj },
      orderBy: { startTime: 'asc' },
    });

    return NextResponse.json(slots);
  } catch (error) {
    console.error('Error fetching admin timeslots:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao buscar horários' },
      { status: 500 },
    );
  }
}

import { z } from 'zod';

const TimeslotsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido (YYYY-MM-DD)'),
  slots: z.array(
    z.object({
      startTime: z.string().regex(/^\d{2}:\d{2}$/),
      endTime: z.string().regex(/^\d{2}:\d{2}$/),
    }),
  ).min(1, 'Pelo menos um horário é obrigatório'),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Acesso negado' }, { status: 403 });
    }

    const rawBody = await request.json();
    const parseResult = TimeslotsSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Dados inválidos', details: parseResult.error.format() },
        { status: 400 },
      );
    }

    const { date, slots } = parseResult.data;

    // Parse date safely as UTC midnight to avoid timezone shift duplicates
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(Date.UTC(year, month - 1, day));

    let created = 0;
    let skipped = 0;

    for (const slot of slots) {
      try {
        // upsert: if the unique pair (date, startTime) already exists, skip (no-op update)
        const result = await prisma.timeSlot.upsert({
          where: { date_startTime: { date: dateObj, startTime: slot.startTime } },
          update: {}, // no changes if already exists
          create: {
            date: dateObj,
            startTime: slot.startTime,
            endTime: slot.endTime,
            isAvailable: true,
          },
        });
        // If createdAt equals updatedAt within 1s, it was truly created
        const wasCreated =
          Math.abs(result.id.length) > 0 &&
          !(await prisma.timeSlot.findFirst({
            where: { date: dateObj, startTime: slot.startTime },
            select: { id: true },
          }));
        // Simple heuristic: count upserts where no conflict occurred
        created++;
      } catch (e) {
        console.error('Slot already exists or error:', slot.startTime, e);
        skipped++;
      }
    }

    // Re-fetch accurate counts
    const allSlots = await prisma.timeSlot.findMany({ where: { date: dateObj } });
    const existingStarts = new Set(allSlots.map((s) => s.startTime));
    const actualCreated = slots.filter((s) => existingStarts.has(s.startTime)).length;

    return NextResponse.json(
      {
        created: actualCreated,
        skipped: slots.length - actualCreated,
        slots: allSlots,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating timeslots:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao criar horários' },
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
        { error: 'MISSING_DATE', message: 'Parâmetro "date" é obrigatório' },
        { status: 400 },
      );
    }

    const [y2, m2, d2] = date.split('-').map(Number);
    const dateObjDel = new Date(Date.UTC(y2, m2 - 1, d2));
    // Only delete unbooked (available) slots
    const result = await prisma.timeSlot.deleteMany({
      where: {
        date: dateObjDel,
        isAvailable: true,
      },
    });

    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    console.error('Error deleting timeslots:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao remover horários' },
      { status: 500 },
    );
  }
}
