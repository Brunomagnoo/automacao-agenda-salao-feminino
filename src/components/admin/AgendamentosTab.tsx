import { useEffect, useState, useCallback } from 'react';
import { formatLocalDate } from '@/lib/utils';
import { fmtCurrency, fmtDate, fmtPhone, calcEndTime } from './utils';

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  PENDING: { label: 'Pendente', class: 'adm-badge--pending' },
  CONFIRMED: { label: 'Confirmado', class: 'adm-badge--confirmed' },
  CANCELLED: { label: 'Cancelado', class: 'adm-badge--cancelled' },
  COMPLETED: { label: 'Concluído', class: 'adm-badge--completed' },
};

interface Appointment {
  id: string;
  user: { uniqueCode: string; name: string; phone: string };
  timeSlot: { date: string; startTime: string; endTime: string };
  totalEstimated: number;
  totalFinal: number | null;
  expenses: number | null;
  totalDurationMin: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  services: { service: { name: string } }[];
}

export default function AgendamentosTab({ isAuthed }: { isAuthed: boolean }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loadingAppts, setLoadingAppts] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [finalValues, setFinalValues] = useState<Record<string, string>>({});
  const [expenseValues, setExpenseValues] = useState<Record<string, string>>({});

  useEffect(() => {
    setDateFilter(formatLocalDate());
  }, []);

  const fetchAppointments = useCallback(async () => {
    setLoadingAppts(true);
    try {
      const params = new URLSearchParams();
      if (dateFilter) params.set('date', dateFilter);
      const url = `/api/admin/appointments${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data: Appointment[] = await res.json();
        setAppointments(statusFilter ? data.filter((a) => a.status === statusFilter) : data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAppts(false);
    }
  }, [dateFilter, statusFilter]);

  useEffect(() => {
    if (isAuthed) fetchAppointments();
  }, [isAuthed, fetchAppointments]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) fetchAppointments();
    } catch (err) {
      console.error(err);
    }
  };

  const saveFinalValue = async (id: string) => {
    const raw = finalValues[id];
    if (!raw) return;
    const value = parseFloat(raw.replace(',', '.'));
    if (isNaN(value)) return;
    try {
      const res = await fetch(`/api/admin/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalFinal: value }),
      });
      if (res.ok) {
        fetchAppointments();
        setFinalValues((prev) => {
          const n = { ...prev };
          delete n[id];
          return n;
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

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
        fetchAppointments();
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

  const deleteAppointments = async () => {
    if (!dateFilter) {
      alert('Selecione uma data no filtro para limpar os agendamentos.');
      return;
    }
    if (
      !confirm(
        'Tem certeza que deseja apagar TODOS os agendamentos desta data? Essa ação não pode ser desfeita e os horários voltarão a ficar disponíveis.',
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/appointments?date=${dateFilter}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        alert(`${data.deleted} agendamentos foram apagados.`);
        fetchAppointments();
      } else {
        alert('Erro ao apagar agendamentos.');
      }
    } catch {
      alert('Erro ao apagar agendamentos.');
    }
  };

  return (
    <div className="adm-section fade-in">
      <div className="adm-section__header">
        <h2>Agendamentos</h2>
        <span className="adm-section__count">{appointments.length} registro(s)</span>
      </div>

      <div className="adm-filters">
        <div className="adm-filter">
          <label>Data</label>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>
        <div className="adm-filter">
          <label>Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos</option>
            <option value="PENDING">Pendente</option>
            <option value="CONFIRMED">Confirmado</option>
            <option value="COMPLETED">Concluído</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
        </div>
        {(dateFilter || statusFilter) && (
          <button
            className="adm-filter__clear"
            onClick={() => {
              setDateFilter('');
              setStatusFilter('');
            }}
          >
            Limpar filtros
          </button>
        )}
        {appointments.length > 0 && dateFilter && (
          <button
            className="adm-btn adm-btn--cancel"
            style={{ marginLeft: 'auto' }}
            onClick={deleteAppointments}
          >
            Apagar Agendamentos
          </button>
        )}
      </div>

      {loadingAppts ? (
        <div className="adm-loading">
          <div className="adm-loading__spinner" />
        </div>
      ) : appointments.length === 0 ? (
        <div className="adm-empty">
          <p>Nenhum agendamento encontrado.</p>
        </div>
      ) : (
        <div className="adm-cards">
          {appointments.map((appt) => {
            const isExpanded = expandedId === appt.id;
            const serviceNames = appt.services.map((s) => s.service.name).join(', ');
            const endTime = calcEndTime(appt.timeSlot.startTime, appt.totalDurationMin);
            const dateStr = typeof appt.timeSlot.date === 'string' ? appt.timeSlot.date.split('T')[0] : '';
            const cfg = STATUS_CONFIG[appt.status];

            return (
              <div key={appt.id} className={`adm-card${isExpanded ? ' adm-card--expanded' : ''}`}>
                <button
                  className="adm-card__header"
                  onClick={() => setExpandedId(isExpanded ? null : appt.id)}
                  type="button"
                >
                  <div className="adm-card__left">
                    <span className={`adm-badge ${cfg.class}`}>{cfg.label}</span>
                    <span className="adm-card__client">{appt.user.name}</span>
                  </div>
                  <div className="adm-card__right">
                    <span className="adm-card__time">
                      {appt.timeSlot.startTime} - {endTime}
                    </span>
                    <svg
                      className={`adm-card__chevron${isExpanded ? ' adm-card__chevron--open' : ''}`}
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </button>

                {isExpanded && (
                  <div className="adm-card__body">
                    <div className="adm-card__grid">
                      <div className="adm-card__field">
                        <label>Código</label>
                        <span>{appt.user.uniqueCode}</span>
                      </div>
                      <div className="adm-card__field">
                        <label>Telefone</label>
                        <span>{fmtPhone(appt.user.phone)}</span>
                      </div>
                      <div className="adm-card__field">
                        <label>Data</label>
                        <span>{dateStr ? fmtDate(dateStr) : '-'}</span>
                      </div>
                      <div className="adm-card__field">
                        <label>Duração</label>
                        <span>{appt.totalDurationMin} min</span>
                      </div>
                    </div>

                    <div className="adm-card__field adm-card__field--full">
                      <label>Serviços</label>
                      <span>{serviceNames}</span>
                    </div>

                    <div className="adm-card__finance">
                      <div className="adm-card__finance-row">
                        <label>Valor estimado</label>
                        <span>{fmtCurrency(appt.totalEstimated)}</span>
                      </div>
                      <div className="adm-card__finance-row">
                        <label>Despesas</label>
                        <div className="adm-card__finance-input">
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder={fmtCurrency(appt.expenses || 0)}
                            value={expenseValues[appt.id] || ''}
                            onChange={(e) =>
                              setExpenseValues((prev) => ({
                                ...prev,
                                [appt.id]: e.target.value,
                              }))
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
                        </div>
                      </div>
                      <div className="adm-card__finance-row">
                        <label>Valor final</label>
                        {appt.totalFinal !== null ? (
                          <span className="adm-card__finance-final">
                            {fmtCurrency(appt.totalFinal)}
                          </span>
                        ) : (
                          <div className="adm-card__finance-input">
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="0,00"
                              value={finalValues[appt.id] || ''}
                              onChange={(e) =>
                                setFinalValues((prev) => ({
                                  ...prev,
                                  [appt.id]: e.target.value,
                                }))
                              }
                            />
                            <button onClick={() => saveFinalValue(appt.id)}>Salvar</button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="adm-card__actions">
                      {appt.status === 'PENDING' && (
                        <>
                          <button
                            className="adm-btn adm-btn--confirm"
                            onClick={() => updateStatus(appt.id, 'CONFIRMED')}
                          >
                            Confirmar
                          </button>
                          <button
                            className="adm-btn adm-btn--cancel"
                            onClick={() => updateStatus(appt.id, 'CANCELLED')}
                          >
                            Cancelar
                          </button>
                        </>
                      )}
                      {appt.status === 'CONFIRMED' && (
                        <>
                          <button
                            className="adm-btn adm-btn--complete"
                            onClick={() => updateStatus(appt.id, 'COMPLETED')}
                          >
                            Concluir
                          </button>
                          <button
                            className="adm-btn adm-btn--cancel"
                            onClick={() => updateStatus(appt.id, 'CANCELLED')}
                          >
                            Cancelar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
