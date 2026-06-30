import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatLocalDate } from '@/lib/utils';
import { NextResponse } from 'next/server';

function getStartOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(d.setDate(diff));
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Acesso negado' }, { status: 403 });
    }

    const now = new Date();
    const todayStr = formatLocalDate(now);

    // Get start of the month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch all completed/confirmed appointments with a final value in the current month
    const appointments = await prisma.appointment.findMany({
      where: {
        timeSlot: {
          date: {
            gte: startOfMonth,
          },
        },
        status: {
          not: 'CANCELLED',
        },
        totalFinal: {
          not: null,
        },
      },
      include: {
        timeSlot: true,
      },
    });

    let dayProfit = 0;
    let weekProfit = 0;
    let monthProfit = 0;

    const startOfWeek = getStartOfWeek(now);
    startOfWeek.setHours(0, 0, 0, 0);

    for (const appt of appointments) {
      const final = appt.totalFinal || 0;
      const expenses = appt.expenses || 0;
      const profit = final - expenses;

      monthProfit += profit;

      const apptDate = appt.timeSlot.date;
      const apptDateStr = formatLocalDate(
        new Date(apptDate.getUTCFullYear(), apptDate.getUTCMonth(), apptDate.getUTCDate()),
      );

      if (apptDateStr === todayStr) {
        dayProfit += profit;
      }

      // Check if it's within the current week
      if (apptDate.getTime() >= startOfWeek.getTime() && apptDate.getTime() <= now.getTime()) {
        weekProfit += profit;
      }
    }

    return NextResponse.json({
      dayProfit,
      weekProfit,
      monthProfit,
    });
  } catch (error) {
    console.error(
      '[DashboardAPI] Erro ao buscar métricas',
      error instanceof Error ? error.message : '',
    );
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao buscar métricas' },
      { status: 500 },
    );
  }
}
