'use client';

import { calculateEndTime, formatDuration, getNextWorkingDays } from '@/lib/utils';
import type { Service, TimeSlot, User } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function HorarioPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [totalDurationMin, setTotalDurationMin] = useState(0);
  const [dates] = useState<string[]>(() => getNextWorkingDays(14));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);

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

        const stored = sessionStorage.getItem('booking-services');
        if (!stored) {
          router.push('/agendar');
          return;
        }
        const parsed: Service[] = JSON.parse(stored);
        setServices(parsed);
        setTotalDurationMin(parsed.reduce((sum, s) => sum + s.durationMin, 0));
      } catch {
        router.push('/login');
      } finally {
        setLoadingAuth(false);
      }
    }
    init();
  }, [router]);

  useEffect(() => {
    if (!selectedDate) return;
    async function fetchSlots() {
      setLoadingSlots(true);
      setSelectedSlot(null);
      try {
        const res = await fetch(`/api/timeslots?date=${selectedDate}`);
        const data: TimeSlot[] = await res.json();
        setTimeSlots(data);
      } catch {
        setTimeSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    }
    fetchSlots();
  }, [selectedDate]);

  const handleContinue = () => {
    if (!selectedSlot) return;
    sessionStorage.setItem('booking-timeslot', JSON.stringify(selectedSlot));
    router.push('/agendar/confirmacao');
  };

  const formatDateCard = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const months = [
      'Jan',
      'Fev',
      'Mar',
      'Abr',
      'Mai',
      'Jun',
      'Jul',
      'Ago',
      'Set',
      'Out',
      'Nov',
      'Dez',
    ];
    return {
      weekday: weekdays[date.getDay()],
      day: date.getDate(),
      month: months[date.getMonth()],
    };
  };

  const isSlotUnavailable = (slot: TimeSlot): boolean => {
    if (!slot.isAvailable) return true;
    const [h, m] = slot.startTime.split(':').map(Number);
    const startMin = h * 60 + m;
    const endMin = startMin + totalDurationMin;

    if (endMin > 20 * 60) return true;

    // Check if any slot within the duration is already unavailable
    const hasOverlap = timeSlots.some((s) => {
      if (s.isAvailable) return false;
      const [sH, sM] = s.startTime.split(':').map(Number);
      const sMin = sH * 60 + sM;
      return sMin >= startMin && sMin < endMin;
    });

    return hasOverlap;
  };

  const getSlotEndTime = (slot: TimeSlot): string => {
    return calculateEndTime(slot.startTime, totalDurationMin);
  };

  const formatSelectedDate = () => {
    if (!selectedDate) return '';
    const date = new Date(selectedDate + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    });
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
        {/* Back Link - Moved to top left for better UX */}
        <div style={{ marginBottom: 'var(--space-md)', textAlign: 'left' }}>
          <Link href="/agendar" className="btn btn--ghost" style={{ padding: '8px 0' }}>
            ← Voltar
          </Link>
        </div>

        {/* Steps */}
        <div className="steps">
          <div className="step step--done">
            <div className="step__dot">✓</div>
          </div>
          <div className="step__line" />
          <div className="step step--active">
            <div className="step__dot">2</div>
          </div>
          <div className="step__line" />
          <div className="step">
            <div className="step__dot">3</div>
          </div>
        </div>

        <h2 className="section-title">Escolha o horário</h2>
        <p className="section-subtitle">Tempo estimado total: {formatDuration(totalDurationMin)}</p>

        {/* Date Picker */}
        <div className="date-picker">
          {dates.map((dateStr) => {
            const { weekday, day, month } = formatDateCard(dateStr);
            return (
              <div
                key={dateStr}
                className={`date-card${selectedDate === dateStr ? ' date-card--selected' : ''}`}
                onClick={() => setSelectedDate(dateStr)}
              >
                <div className="date-card__weekday">{weekday}</div>
                <div className="date-card__day">{day}</div>
                <div className="date-card__month">{month}</div>
              </div>
            );
          })}
        </div>

        {/* Time Slots */}
        {selectedDate && (
          <>
            {loadingSlots ? (
              <div className="loading">
                <div className="spinner" />
              </div>
            ) : timeSlots.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">📅</div>
                <p className="empty-state__text">Nenhum horário disponível para esta data.</p>
              </div>
            ) : (
              <div className="timeslots-grid">
                {timeSlots.map((slot) => {
                  const unavailable = isSlotUnavailable(slot);
                  const isSelected = selectedSlot?.id === slot.id;
                  return (
                    <div
                      key={slot.id}
                      className={`timeslot${isSelected ? ' timeslot--selected' : ''}${unavailable ? ' timeslot--unavailable' : ''}`}
                      onClick={() => {
                        if (!unavailable) setSelectedSlot(slot);
                      }}
                    >
                      <div>{slot.startTime}</div>
                      {!unavailable && (
                        <div
                          style={{ fontSize: 'var(--font-size-xs)', marginTop: 2, opacity: 0.7 }}
                        >
                          até {getSlotEndTime(slot)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Back Link Removed (moved to top) */}

        {/* Summary Bar */}
        {selectedSlot && (
          <div className="summary-bar">
            <div className="summary-bar__inner">
              <div className="summary-bar__info">
                <span className="summary-bar__total">{formatSelectedDate()}</span>
                <span className="summary-bar__details">
                  {selectedSlot.startTime} às {getSlotEndTime(selectedSlot)}
                </span>
              </div>
              <button className="btn btn--primary" onClick={handleContinue}>
                Continuar →
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
