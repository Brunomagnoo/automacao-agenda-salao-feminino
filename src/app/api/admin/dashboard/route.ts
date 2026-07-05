import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Returns YYYY-MM-DD from a UTC Date object (safe for @db.Date fields)
function toUTCDateStr(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Returns YYYY-MM-DD from local (Brasília) wall clock
function toLocalDateStr(date: Date): string {
  // BRT = UTC-3, subtract 3h to get Brasília date
  const brt = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  return toUTCDateStr(brt);
}

// Returns UTC midnight Date for a YYYY-MM-DD string
function utcMidnight(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

// Returns start of ISO week (Monday) for a local BRT date string
function startOfISOWeek(localDateStr: string): Date {
  const d = utcMidnight(localDateStr);
  const day = d.getUTCDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Acesso negado' }, { status: 403 });
    }

    const now = new Date();

    // All date comparisons use BRT (Brasília) wall-clock date
    const todayStr = toLocalDateStr(now);

    // Start of current month in BRT
    const [ty, tm] = todayStr.split('-').map(Number);
    const startOfMonth = new Date(Date.UTC(ty, tm - 1, 1));

    // Start of ISO week (Monday) in BRT
    const startOfWeek = startOfISOWeek(todayStr);

    // End of today in UTC (tomorrow midnight = exclusive upper bound)
    const tomorrowStr = toUTCDateStr(new Date(utcMidnight(todayStr).getTime() + 24 * 60 * 60 * 1000));
    const todayEnd = utcMidnight(tomorrowStr);

    const appointments = await prisma.appointment.findMany({
      where: {
        timeSlot: { date: { gte: startOfMonth } },
        status: { not: 'CANCELLED' },
        totalFinal: { not: null },
      },
      include: {
        timeSlot: true,
        services: { include: { service: true } },
      },
    });

    let dayProfit = 0;
    let weekProfit = 0;
    let monthProfit = 0;
    let monthExpenses = 0;

    // Chart: last 7 BRT days including today
    const chartDataMap: Record<string, { profit: number; expenses: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(utcMidnight(todayStr).getTime() - i * 24 * 60 * 60 * 1000);
      chartDataMap[toUTCDateStr(d)] = { profit: 0, expenses: 0 };
    }

    const serviceCountMap: Record<string, number> = {};

    for (const appt of appointments) {
      const final = appt.totalFinal ?? 0;
      const expenses = appt.expenses ?? 0;
      const profit = final - expenses;

      // apptDate from @db.Date is always UTC midnight — use toUTCDateStr directly
      const apptDate = appt.timeSlot.date; // e.g., 2026-06-30T00:00:00.000Z
      const apptDateStr = toUTCDateStr(apptDate); // "2026-06-30"

      // Month profit: all fetched appointments are already within month range
      monthProfit += profit;
      monthExpenses += expenses;

      // Day: compare date strings (both in same reference: UTC midnight of BRT day)
      if (apptDateStr === todayStr) {
        dayProfit += profit;
      }

      // Week: apptDate UTC midnight >= startOfWeek UTC midnight
      if (apptDate.getTime() >= startOfWeek.getTime() && apptDate.getTime() < todayEnd.getTime()) {
        weekProfit += profit;
      }

      // Chart: match against the 7-day window
      if (chartDataMap[apptDateStr]) {
        chartDataMap[apptDateStr].profit += profit;
        chartDataMap[apptDateStr].expenses += expenses;
      }

      // Top services count
      for (const s of appt.services) {
        const name = s.service.name;
        serviceCountMap[name] = (serviceCountMap[name] || 0) + 1;
      }
    }

    const chartData = Object.entries(chartDataMap).map(([date, data]) => ({
      date: date.substring(8, 10) + '/' + date.substring(5, 7), // DD/MM
      valor: Math.round(data.profit * 100) / 100, // avoid floating point noise
      despesas: Math.round(data.expenses * 100) / 100,
    }));

    const topServices = Object.entries(serviceCountMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // top 5 only

    return NextResponse.json({
      dayProfit: Math.round(dayProfit * 100) / 100,
      weekProfit: Math.round(weekProfit * 100) / 100,
      monthProfit: Math.round(monthProfit * 100) / 100,
      monthExpenses: Math.round(monthExpenses * 100) / 100,
      chartData,
      topServices,
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

