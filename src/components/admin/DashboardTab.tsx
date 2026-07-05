import { useEffect, useState, useCallback } from 'react';
import { fmtCurrency } from './utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

type ChartData = { date: string; valor: number };
type TopService = { name: string; value: number };

const PIE_COLORS = ['#C88A83', '#E6B8B3', '#9D5C55', '#4A3B39', '#F2D5D2'];

export default function DashboardTab({ isAuthed }: { isAuthed: boolean }) {
  const [dashMetrics, setDashMetrics] = useState({
    dayProfit: 0,
    weekProfit: 0,
    monthProfit: 0,
    monthExpenses: 0,
    chartData: [] as ChartData[],
    topServices: [] as TopService[],
  });
  const [loadingDash, setLoadingDash] = useState(false);
  const [selectedDay, setSelectedDay] = useState<ChartData | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoadingDash(true);
    try {
      const res = await fetch('/api/admin/dashboard');
      if (res.ok) setDashMetrics(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDash(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthed) fetchDashboard();
  }, [isAuthed, fetchDashboard]);

  return (
    <div className="adm-panel">
      <h2 className="adm-title">Dashboard Analítico</h2>

      {loadingDash ? (
        <div className="adm-loading">
          <div className="adm-loading__spinner" />
        </div>
      ) : (
        <>
          <div className="adm-caixa-summary" style={{ marginTop: '20px' }}>
            <div className="adm-caixa-card adm-caixa-card--highlight">
              <span className="adm-caixa-card__label">
                {selectedDay ? `Faturamento (${selectedDay.date})` : 'Faturamento do Dia'}
              </span>
              <span className="adm-caixa-card__value">
                {fmtCurrency(selectedDay ? selectedDay.valor : dashMetrics.dayProfit)}
              </span>
            </div>
            <div className="adm-caixa-card">
              <span className="adm-caixa-card__label">Faturamento da Semana</span>
              <span className="adm-caixa-card__value">{fmtCurrency(dashMetrics.weekProfit)}</span>
            </div>
            <div className="adm-caixa-card">
              <span className="adm-caixa-card__label">Faturamento do Mês</span>
              <span className="adm-caixa-card__value">{fmtCurrency(dashMetrics.monthProfit)}</span>
            </div>
            <div className="adm-caixa-card">
              <span className="adm-caixa-card__label">Despesas Totais (Mês)</span>
              <span className="adm-caixa-card__value">{fmtCurrency(dashMetrics.monthExpenses)}</span>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px',
              marginTop: '30px',
            }}
          >
            {/* Chart 1: Revenue over last 7 days */}
            <div
              style={{
                background: '#fff',
                padding: '20px',
                borderRadius: '16px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
              }}
            >
              <h3
                style={{
                  fontSize: '1rem',
                  color: '#4A3B39',
                  marginBottom: '20px',
                  fontWeight: 600,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>Faturamento (Últimos 7 dias)</span>
                {selectedDay && (
                  <button 
                    onClick={() => setSelectedDay(null)}
                    style={{
                      fontSize: '0.8rem',
                      background: 'none',
                      border: 'none',
                      color: '#9D5C55',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    Ver hoje
                  </button>
                )}
              </h3>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={dashMetrics.chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6B8B3" opacity={0.5} />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#4A3B39', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#4A3B39', fontSize: 12 }}
                      tickFormatter={(val) => `R$${val}`}
                      dx={-10}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(200, 138, 131, 0.1)' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                      formatter={(value: any) => [fmtCurrency(Number(value) || 0), 'Faturamento']}
                    />
                    <Bar 
                      dataKey="valor" 
                      fill="#C88A83" 
                      radius={[6, 6, 0, 0]} 
                      barSize={30}
                      style={{ cursor: 'pointer' }}
                      onClick={(data: any) => {
                        if (data && data.date !== undefined) {
                          setSelectedDay(prev => prev?.date === data.date ? null : { date: data.date, valor: data.valor });
                        }
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Top Services (Pie) */}
            <div
              style={{
                background: '#fff',
                padding: '20px',
                borderRadius: '16px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
              }}
            >
              <h3
                style={{
                  fontSize: '1rem',
                  color: '#4A3B39',
                  marginBottom: '20px',
                  fontWeight: 600,
                }}
              >
                Serviços Mais Vendidos (Mês)
              </h3>
              <div style={{ width: '100%', height: 300 }}>
                {dashMetrics.topServices.length > 0 ? (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={dashMetrics.topServices}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                      >
                        {dashMetrics.topServices.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                        formatter={(value: any, name: any) => [`${value} agendamento${Number(value) !== 1 ? 's' : ''}`, name]}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                        wrapperStyle={{ fontSize: '12px', color: '#4A3B39' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div
                    style={{
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#9CA3AF',
                      fontSize: '0.9rem',
                    }}
                  >
                    Nenhum serviço finalizado neste mês.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
