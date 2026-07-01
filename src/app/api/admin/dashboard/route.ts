import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatLocalDate } from '@/lib/utils';
import { NextResponse } from 'next/server';

function getStartOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
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
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

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

    const startOfWeek = getStartOfWeek(now);
    startOfWeek.setHours(0, 0, 0, 0);

    // Prepare chart data for last 7 days
    const chartDataMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      chartDataMap[formatLocalDate(d)] = 0;
    }

    // Prepare top services pie chart
    const serviceCountMap: Record<string, number> = {};

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

      if (apptDate.getTime() >= startOfWeek.getTime() && apptDate.getTime() <= now.getTime()) {
        weekProfit += profit;
      }

      if (chartDataMap[apptDateStr] !== undefined) {
        chartDataMap[apptDateStr] += profit;
      }

      // Count services
      for (const s of appt.services) {
        const name = s.service.name;
        serviceCountMap[name] = (serviceCountMap[name] || 0) + 1;
      }
    }

    const chartData = Object.entries(chartDataMap).map(([date, value]) => ({
      date: date.substring(8, 10) + '/' + date.substring(5, 7), // DD/MM format
      valor: value,
    }));

    const topServices = Object.entries(serviceCountMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return NextResponse.json({
      dayProfit,
      weekProfit,
      monthProfit,
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
