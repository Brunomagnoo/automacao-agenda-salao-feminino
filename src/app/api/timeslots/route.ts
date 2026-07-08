import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

const WORKING_DAYS = [2, 3, 4, 5, 6]; // Ter=2, Qua=3, Qui=4, Sex=5, Sab=6
const START_SLOTS = [
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
  '18:00',
  '18:30',
  '19:00',
  '19:30',
];

// B-07 FIX: always parse date strings as UTC midnight to avoid timezone-dependent behavior
function toUTCDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

async function ensureSlotsForDate(dateStr: string): Promise<void> {
  // Use noon UTC to safely determine day-of-week regardless of server timezone
  const dateObj = new Date(dateStr + 'T12:00:00Z');
  const dayOfWeek = dateObj.getUTCDay();
  if (!WORKING_DAYS.includes(dayOfWeek)) return;

  // B-07 FIX: use toUTCDate for consistent @db.Date comparison
  const utcDate = toUTCDate(dateStr);
  const existing = await prisma.timeSlot.count({ where: { date: utcDate } });
  if (existing > 0) return;

  const creates = START_SLOTS.map((startTime) => {
    const [h, m] = startTime.split(':').map(Number);
    const endMinutes = h * 60 + m + 30;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
    return {
      id: `slot-${dateStr}-${startTime}`,
      date: utcDate,
      startTime,
      endTime,
      isAvailable: true,
    };
  });

  await prisma.timeSlot.createMany({ data: creates, skipDuplicates: true });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { error: 'MISSING_DATE', message: 'Parâmetro "date" é obrigatório' },
        { status: 400 },
      );
    }

    // S-08 FIX: validate date format before using it in DB queries
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'BAD_DATE', message: 'Formato de data inválido. Use YYYY-MM-DD.' },
        { status: 400 },
      );
    }

    const utcDate = toUTCDate(date);

    // Auto-create slots if they don't exist for this working day
    await ensureSlotsForDate(date);

    const timeSlots = await prisma.timeSlot.findMany({
      where: { date: utcDate },
      orderBy: { startTime: 'asc' },
    });

    return NextResponse.json(timeSlots);
  } catch (error) {
    console.error('[Timeslots] Erro ao buscar horários:', error instanceof Error ? error.message : '');
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao buscar horários' },
      { status: 500 },
    );
  }
}

