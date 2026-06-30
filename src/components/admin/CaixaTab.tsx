import { useEffect, useState, useCallback } from 'react';
import { formatLocalDate } from '@/lib/utils';
import { fmtCurrency } from './utils';

// We just copy the minimal Appointment interface we need for Caixa
interface Appointment {
  id: string;
  user: { name: string };
  services: { service: { name: string } }[];
  totalEstimated: number;
  totalFinal: number | null;
  expenses: number | null;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
}

export default function CaixaTab({ isAuthed }: { isAuthed: boolean }) {
  const [caixaDate, setCaixaDate] = useState('');
  const [caixaAppts, setCaixaAppts] = useState<Appointment[]>([]);
  const [loadingCaixa, setLoadingCaixa] = useState(false);
  const [expenseValues, setExpenseValues] = useState<Record<string, string>>({});

  useEffect(() => {
    setCaixaDate(formatLocalDate());
  }, []);

  const fetchCaixa = useCallback(async () => {
    if (!caixaDate) return;
    setLoadingCaixa(true);
    try {
      const res = await fetch(`/api/admin/appointments?date=${caixaDate}`);
      if (res.ok) {
        const data: Appointment[] = await res.json();
        setCaixaAppts(data.filter((a) => a.status === 'COMPLETED' || a.status === 'CONFIRMED'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCaixa(false);
    }
  }, [caixaDate]);

  useEffect(() => {
    if (isAuthed && caixaDate) fetchCaixa();
  }, [isAuthed, caixaDate, fetchCaixa]);

  const saveExpenseValue = async (id: string) => {
    const raw = expenseValues[id];
    if (!raw) return;
    const value = parseFloat(raw.replace(',', '.'));
    if (isNaN(value)) return;
    try {
      const res = await fetch(`/api/admin/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenses: value }),
      });
      if (res.ok) {
        fetchCaixa();
        setExpenseValues((prev) => {
          const n = { ...prev };
          delete n[id];
          return n;
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const caixaEstimated = caixaAppts.reduce((s, a) => s + a.totalEstimated, 0);
  const caixaExpenses = caixaAppts.reduce((s, a) => s + (a.expenses ?? 0), 0);
  const caixaFinal = caixaAppts.reduce((s, a) => s + ((a.totalFinal ?? 0) - (a.expenses ?? 0)), 0);
  const caixaWithFinal = caixaAppts.filter((a) => a.totalFinal !== null).length;
  const caixaWithoutFinal = caixaAppts.length - caixaWithFinal;

  return (
    <div className="adm-section fade-in">
      <div className="adm-section__header">
        <h2>Controle de Caixa</h2>
      </div>

      <div className="adm-filters">
        <div className="adm-filter">
          <label>Data</label>
          <input
            type="date"
            value={caixaDate}
            onChange={(e) => setCaixaDate(e.target.value)}
          />
        </div>
      </div>

      {loadingCaixa ? (
        <div className="adm-loading">
          <div className="adm-loading__spinner" />
        </div>
      ) : caixaDate && caixaAppts.length > 0 ? (
        <>
          <div className="adm-caixa-summary">
            <div className="adm-caixa-card">
              <span className="adm-caixa-card__label">Atendimentos</span>
              <span className="adm-caixa-card__value">{caixaAppts.length}</span>
            </div>
            <div className="adm-caixa-card">
              <span className="adm-caixa-card__label">Total Estimado</span>
              <span className="adm-caixa-card__value">{fmtCurrency(caixaEstimated)}</span>
            </div>
            <div className="adm-caixa-card">
              <span className="adm-caixa-card__label">Total Despesas</span>
              <span className="adm-caixa-card__value adm-caixa-card__value--warn">{fmtCurrency(caixaExpenses)}</span>
            </div>
            <div className="adm-caixa-card adm-caixa-card--highlight">
              <span className="adm-caixa-card__label">Total Real</span>
              <span className="adm-caixa-card__value">{fmtCurrency(caixaFinal)}</span>
            </div>
            <div className="adm-caixa-card">
              <span className="adm-caixa-card__label">Sem valor final</span>
              <span className="adm-caixa-card__value adm-caixa-card__value--warn">
                {caixaWithoutFinal}
              </span>
            </div>
          </div>

          <div className="adm-caixa-table">
            <div className="adm-caixa-row adm-caixa-row--header">
              <span>Cliente</span>
              <span>Serviços</span>
              <span>Estimado</span>
              <span>Despesas</span>
              <span>Final</span>
              <span>Diferença</span>
            </div>
            {caixaAppts.map((appt) => {
              const estimated = appt.totalEstimated || 0;
              const final = appt.totalFinal !== null ? appt.totalFinal : null;
              const expenses = appt.expenses || 0;
              const diff = final !== null ? final - estimated - expenses : null;
              return (
                <div key={appt.id} className="adm-caixa-row">
                  <span>{appt.user.name.split(' ')[0]}</span>
                  <span className="adm-caixa-row__services">
                    {appt.services.map((s) => s.service.name).join(', ')}
                  </span>
                  <span>{fmtCurrency(estimated)}</span>

                  <span className="adm-card__finance-input">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder={fmtCurrency(expenses)}
                      value={expenseValues[appt.id] || ''}
                      onChange={(e) =>
                        setExpenseValues((prev) => ({ ...prev, [appt.id]: e.target.value }))
                      }
                      style={{ width: '80px', padding: '4px 6px' }}
                    />
                    {expenseValues[appt.id] !== undefined && (
                      <button
                        onClick={() => saveExpenseValue(appt.id)}
                        style={{ padding: '4px 8px' }}
                      >
                        ✓
                      </button>
                    )}
                  </span>

                  <span
                    className={
                      final !== null ? 'adm-caixa-row__final' : 'adm-caixa-row__pending'
                    }
                  >
                    {final !== null ? fmtCurrency(final) : 'Pendente'}
                  </span>
                  <span
                    className={
                      diff !== null
                        ? diff >= 0
                          ? 'adm-caixa-row__pos'
                          : 'adm-caixa-row__neg'
                        : ''
                    }
                  >
                    {diff !== null ? (diff >= 0 ? '+' : '') + fmtCurrency(diff) : '-'}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      ) : caixaDate ? (
        <div className="adm-empty">
          <p>Nenhum atendimento concluído/confirmado nesta data.</p>
        </div>
      ) : (
        <div className="adm-empty">
          <p>Selecione uma data para visualizar o caixa do dia.</p>
        </div>
      )}
    </div>
  );
}
