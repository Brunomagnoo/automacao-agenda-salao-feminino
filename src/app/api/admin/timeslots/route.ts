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

    const slots = await prisma.timeSlot.findMany({
      where: { date: new Date(date) },
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

    const dateObj = new Date(date);
    const created: unknown[] = [];
    const skipped: string[] = [];

    // Busca os slots que já existem para este dia
    const existingSlots = await prisma.timeSlot.findMany({
      where: { date: dateObj },
    });
    const existingStarts = new Set(existingSlots.map((s) => s.startTime));

    for (const slot of slots) {
      if (existingStarts.has(slot.startTime)) {
        skipped.push(slot.startTime);
        continue;
      }

      try {
        const newSlot = await prisma.timeSlot.create({
          data: {
            date: dateObj,
            startTime: slot.startTime,
            endTime: slot.endTime,
            isAvailable: true,
          },
        });
        created.push(newSlot);
      } catch (e) {
        console.error('Error creating slot:', e);
      }
    }

    return NextResponse.json(
      { created: created.length, skipped: skipped.length, slots: created },
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

    // Only delete unbooked (available) slots
    const result = await prisma.timeSlot.deleteMany({
      where: {
        date: new Date(date),
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
