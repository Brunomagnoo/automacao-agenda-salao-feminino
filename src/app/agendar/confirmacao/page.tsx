'use client';

import { calculateEndTime, formatDate, formatDuration, formatPrice } from '@/lib/utils';
import type { Service, TimeSlot, User } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ConfirmacaoPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [timeSlot, setTimeSlot] = useState<TimeSlot | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const authRes = await fetch('/api/auth/me');
        if (authRes.status === 401) {
          router.push('/login');
          return;
        }
        const userData = await authRes.json();
        setUser(userData.user);

        const storedServices = sessionStorage.getItem('booking-services');
        const storedSlot = sessionStorage.getItem('booking-timeslot');

        if (!storedServices || !storedSlot) {
          router.push('/agendar');
          return;
        }

        setServices(JSON.parse(storedServices));
        setTimeSlot(JSON.parse(storedSlot));
      } catch {
        router.push('/login');
      } finally {
        setLoadingAuth(false);
      }
    }
    init();
  }, [router]);

  const totalPrice = services.reduce((sum, s) => sum + s.basePrice, 0);
  const totalDurationMin = services.reduce((sum, s) => sum + s.durationMin, 0);

  const getEndTime = (): string => {
    if (!timeSlot) return '';
    return calculateEndTime(timeSlot.startTime, totalDurationMin);
  };

  const endTime = getEndTime();

  const handleConfirm = async () => {
    if (!timeSlot) return;
    setLoading(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceIds: services.map((s) => s.id),
          timeSlotId: timeSlot.id,
          totalEstimated: totalPrice,
          totalDurationMin,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Erro ao agendar');
      }

      setConfirmed(true);
      sessionStorage.removeItem('booking-services');
      sessionStorage.removeItem('booking-timeslot');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao agendar';
      alert(`Falha no agendamento: ${msg}\nPor favor, tente novamente ou escolha outro horário.`);
    } finally {
      setLoading(false);
    }
  };

  const handleBackHome = () => {
    sessionStorage.removeItem('booking-services');
    sessionStorage.removeItem('booking-timeslot');
    router.push('/');
  };

  if (loadingAuth) {
    return (
      <div className="loading" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="header">
        <div className="header__inner">
          <div className="header__logo">
            <img src="/LOGO2s.PNG.png" alt="Beauty Salon" style={{ height: 40 }} />
            <span className="header__logo-text">Beauty Salon</span>
          </div>
          <div className="header__actions">
            {user && (
              <span className="header__user">
                Olá, <strong>{user.name.split(' ')[0]}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container page fade-in">
        {/* Steps */}
        <div className="steps">
          <div className="step step--done">
            <div className="step__dot">✓</div>
          </div>
          <div className="step__line" />
          <div className="step step--done">
            <div className="step__dot">✓</div>
          </div>
          <div className="step__line" />
          <div className="step step--active">
            <div className="step__dot">3</div>
          </div>
        </div>

        {!confirmed ? (
          <>
            <h2 className="section-title">Confirme seu agendamento</h2>

            {/* Receipt */}
            <div className="receipt">
              <div className="receipt__header">
                <h3>Resumo do Agendamento</h3>
              </div>
              <div className="receipt__body">
                {services.map((service) => (
                  <div key={service.id} className="receipt__row">
                    <span className="receipt__label">{service.name}</span>
                    <span className="receipt__value">{formatPrice(service.basePrice)}</span>
                  </div>
                ))}
                <div className="receipt__row">
                  <span className="receipt__label">📅 Data</span>
                  <span className="receipt__value">
                    {timeSlot ? formatDate(timeSlot.date) : ''}
                  </span>
                </div>
                <div className="receipt__row">
                  <span className="receipt__label">⏰ Horário</span>
                  <span className="receipt__value">
                    {timeSlot ? `${timeSlot.startTime} às ${endTime}` : ''}
                  </span>
                </div>
                <div className="receipt__row">
                  <span className="receipt__label">⏱️ Tempo estimado</span>
                  <span className="receipt__value">{formatDuration(totalDurationMin)}</span>
                </div>
              </div>
              <div className="receipt__total">
                <span className="receipt__total-label">Total Estimado</span>
                <span className="receipt__total-value">{formatPrice(totalPrice)}</span>
              </div>
            </div>

            {/* Actions */}
            <div
              style={{
                marginTop: 'var(--space-xl)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-md)',
              }}
            >
              <button
                className="btn btn--primary btn--block btn--lg"
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading ? 'Confirmando...' : 'Confirmar Agendamento ✓'}
              </button>
              <Link href="/agendar" className="btn btn--ghost" style={{ justifyContent: 'center' }}>
                ← Voltar e Editar
              </Link>
            </div>
          </>
        ) : (
          <div className="confirmation">
            <div className="confirmation__icon">✅</div>
            <h2 className="confirmation__title">Agendamento Confirmado!</h2>
            <p className="confirmation__message">
              Confirmação feita com sucesso! O salão já foi notificado sobre o seu agendamento.
              {'\n'}Entraremos em contato em breve, para finalizarmos os detalhes do serviço.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <button className="btn btn--secondary btn--block" onClick={handleBackHome}>
                Voltar ao Início
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
