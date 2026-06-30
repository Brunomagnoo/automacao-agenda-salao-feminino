import { useEffect, useState, useCallback } from 'react';
import { fmtCurrency } from './utils';

export default function DashboardTab({ isAuthed }: { isAuthed: boolean }) {
  const [dashMetrics, setDashMetrics] = useState({ dayProfit: 0, weekProfit: 0, monthProfit: 0 });
  const [loadingDash, setLoadingDash] = useState(false);

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
      <h2 className="adm-title">Dashboard Financeiro</h2>

      {loadingDash ? (
        <div className="adm-loading">
          <div className="adm-loading__spinner" />
        </div>
      ) : (
        <div className="adm-caixa-summary" style={{ marginTop: '20px' }}>
          <div className="adm-caixa-card adm-caixa-card--highlight">
            <span className="adm-caixa-card__label">Lucro do Dia</span>
            <span className="adm-caixa-card__value">{fmtCurrency(dashMetrics.dayProfit)}</span>
          </div>
          <div className="adm-caixa-card">
            <span className="adm-caixa-card__label">Lucro da Semana</span>
            <span className="adm-caixa-card__value">{fmtCurrency(dashMetrics.weekProfit)}</span>
          </div>
          <div className="adm-caixa-card">
            <span className="adm-caixa-card__label">Lucro do Mês</span>
            <span className="adm-caixa-card__value">{fmtCurrency(dashMetrics.monthProfit)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
