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
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestConsent, setGuestConsent] = useState(false);
  const [userExisted, setUserExisted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const authRes = await fetch('/api/auth/me');
        if (authRes.ok) {
          const userData = await authRes.json();
          setUser(userData.user);
        } else {
          setUser(null);
        }

        const storedServices = sessionStorage.getItem('booking-services');
        const storedSlot = sessionStorage.getItem('booking-timeslot');

        if (!storedServices || !storedSlot) {
          router.push('/agendar');
          return;
        }

        // B-05 FIX: validate structure after parsing to prevent silent crashes on corrupt data
        let parsedServices: Service[];
        let parsedSlot: TimeSlot;

        try {
          parsedServices = JSON.parse(storedServices);
          parsedSlot = JSON.parse(storedSlot);
        } catch {
          // Corrupted sessionStorage data — clear and redirect
          sessionStorage.removeItem('booking-services');
          sessionStorage.removeItem('booking-timeslot');
          router.push('/agendar');
          return;
        }

        // Structural validation: ensure minimum required fields are present
        const isValidServices =
          Array.isArray(parsedServices) &&
          parsedServices.length > 0 &&
          parsedServices.every((s) => typeof s.id === 'string' && typeof s.name === 'string' && typeof s.basePrice === 'number');

        const isValidSlot =
          parsedSlot &&
          typeof parsedSlot.id === 'string' &&
          typeof parsedSlot.startTime === 'string' &&
          typeof parsedSlot.date === 'string';

        if (!isValidServices || !isValidSlot) {
          sessionStorage.removeItem('booking-services');
          sessionStorage.removeItem('booking-timeslot');
          router.push('/agendar');
          return;
        }

        setServices(parsedServices);
        setTimeSlot(parsedSlot);
      } catch {
        setUser(null);
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
    
    if (!user) {
      if (!guestName.trim() || !guestPhone.trim()) {
        alert('Por favor, informe seu Nome e WhatsApp para continuar.');
        return;
      }
      if (!guestConsent) {
        alert('Por favor, confirme que você aceita nossa Política de Privacidade para continuar.');
        return;
      }
    }

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
          name: guestName,
          phone: guestPhone,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Erro ao agendar');
      }

      const resData = await res.json();
      if (resData.userExistedBefore) {
        setUserExisted(true);
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

            {/* Actions & Guest Form */}
            <div
              style={{
                marginTop: 'var(--space-xl)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-md)',
              }}
            >
              {!user && (
                <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-border)', marginBottom: '10px' }}>
                  <h4 style={{ marginBottom: '15px', color: 'var(--color-text-primary)' }}>Seus Dados</h4>
                  <div className="form-group">
                    <label htmlFor="guestName" className="form-label">Nome Completo</label>
                    <input
                      id="guestName"
                      type="text"
                      className="form-input"
                      placeholder="Como gostaria de ser chamada?"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginTop: '15px' }}>
                    <label htmlFor="guestPhone" className="form-label">WhatsApp</label>
                    <input
                      id="guestPhone"
                      type="text"
                      className="form-input"
                      placeholder="(11) 98765-4321"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                    />
                  </div>
                  {/* L-05 LGPD: Explicit consent required before storing personal data */}
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: '15px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                    <input
                      id="guestConsent"
                      type="checkbox"
                      checked={guestConsent}
                      onChange={(e) => setGuestConsent(e.target.checked)}
                      style={{ marginTop: '2px', accentColor: 'var(--color-primary)', flexShrink: 0 }}
                    />
                    <span>
                      Ao confirmar, concordo que meus dados (nome e telefone) serão armazenados para gestão do meu agendamento, conforme a{' '}
                      <strong>Lei Geral de Proteção de Dados (LGPD)</strong>.
                    </span>
                  </label>
                  <div style={{ marginTop: '12px', fontSize: '0.9rem', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                    Já tem um cadastro? <Link href="/login" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Faça login aqui</Link>
                  </div>
                </div>
              )}

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

            {userExisted && !user && (
              <div style={{ background: '#f8f4f4', padding: '15px', borderRadius: '8px', border: '1px solid #E6B8B3', marginTop: '20px', marginBottom: '20px', textAlign: 'center' }}>
                <h4 style={{ color: '#9D5C55', marginBottom: '8px' }}>💡 Dica: Mantenha seu histórico!</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                  Vimos que você já usou esse número antes. Para ter acesso aos seus agendamentos antigos e poder cancelar sozinho, considere criar uma senha ou fazer login na sua próxima visita!
                </p>
                <Link href="/login" style={{ display: 'inline-block', marginTop: '10px', color: 'var(--color-primary)', textDecoration: 'underline', fontSize: '0.9rem', fontWeight: 500 }}>
                  Acessar minha conta
                </Link>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginTop: (userExisted && !user) ? '0' : 'var(--space-xl)' }}>
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
