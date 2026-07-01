'use client';

import { formatDuration, formatPrice } from '@/lib/utils';
import type { Service, User } from '@/types';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const CATEGORY_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  CABELO: { emoji: '💇‍♀️', label: 'Cabelo', color: '#C8956C' },
  MANICURE: { emoji: '💅', label: 'Manicure & Pedicure', color: '#d4748c' },
};

export default function AgendarPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [animatingId, setAnimatingId] = useState<string | null>(null);

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

        const svcRes = await fetch('/api/services');
        const svcData: Service[] = await svcRes.json();
        setServices(svcData);
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  const toggleService = (id: string) => {
    setAnimatingId(id);
    setTimeout(() => setAnimatingId(null), 300);

    setSelectedIds((prev) => {
      let next = [...prev];

      if (next.includes(id)) {
        // Deselecting
        next = next.filter((sid) => sid !== id);
      } else {
        // Selecting
        next.push(id);

        // Smart Logic for Manicure Combo
        const hasManicure = next.includes('manicure-10');
        const hasPedicure = next.includes('manicure-11');
        const hasCombo = next.includes('manicure-12');

        if (id === 'manicure-10' || id === 'manicure-11') {
          if (hasManicure && hasPedicure) {
            // Selected both individual: switch to combo automatically
            next = next.filter((sid) => sid !== 'manicure-10' && sid !== 'manicure-11');
            if (!next.includes('manicure-12')) next.push('manicure-12');
          } else if (hasCombo) {
            // Selected individual while combo was active: switch to individual
            next = next.filter((sid) => sid !== 'manicure-12');
          }
        } else if (id === 'manicure-12') {
          // Selected combo: remove individual selections
          next = next.filter((sid) => sid !== 'manicure-10' && sid !== 'manicure-11');
        }
      }

      return next;
    });
  };

  const selectedServices = services.filter((s) => selectedIds.includes(s.id));
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.basePrice, 0);
  const totalDurationMin = selectedServices.reduce((sum, s) => sum + s.durationMin, 0);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.clear();
    router.push('/');
  };

  const handleContinue = () => {
    sessionStorage.setItem('booking-services', JSON.stringify(selectedServices));
    router.push('/agendar/horario');
  };

  const grouped = services.reduce<Record<string, Service[]>>((acc, svc) => {
    if (!acc[svc.category]) acc[svc.category] = [];
    acc[svc.category].push(svc);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="svc-loading">
        <div className="svc-loading__inner">
          <div className="svc-loading__spinner" />
          <p>Carregando serviços...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <header className="svc-header">
        <div className="svc-header__inner">
          <div className="svc-header__logo">
            <span>Beauty Salon</span>
          </div>
          <div className="svc-header__right">
            {user && (
              <div className="svc-header__user">
                <div className="svc-header__avatar">{user.name.charAt(0).toUpperCase()}</div>
                <span>{user.name.split(' ')[0]}</span>
              </div>
            )}
            <button className="svc-header__logout" onClick={handleLogout}>
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="svc-page fade-in">
        {/* Progress Steps */}
        <div className="svc-steps">
          <div className="svc-step svc-step--active">
            <div className="svc-step__circle">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span>Serviços</span>
          </div>
          <div className="svc-step__connector" />
          <div className="svc-step">
            <div className="svc-step__circle">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <span>Horário</span>
          </div>
          <div className="svc-step__connector" />
          <div className="svc-step">
            <div className="svc-step__circle">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <span>Confirmar</span>
          </div>
        </div>

        {/* Hero */}
        <div className="svc-hero">
          <h1 className="svc-hero__title">O que deseja fazer hoje?</h1>
          <p className="svc-hero__sub">Selecione um ou mais serviços</p>
        </div>

        {/* Service Categories */}
        <div className="svc-categories">
          {Object.entries(grouped).map(([category, categoryServices]) => {
            const config = CATEGORY_CONFIG[category] || {
              emoji: '✨',
              label: category,
              color: '#C8956C',
            };
            const selectedInCategory = categoryServices.filter((s) =>
              selectedIds.includes(s.id),
            ).length;

            return (
              <div key={category} className="svc-category">
                {/* Category Header */}
                <div className="svc-category__header">
                  <div className="svc-category__title-wrap">
                    <span className="svc-category__emoji">{config.emoji}</span>
                    <div>
                      <h2 className="svc-category__name">{config.label}</h2>
                      <p className="svc-category__count">
                        {categoryServices.length} serviços disponíveis
                      </p>
                    </div>
                  </div>
                  {selectedInCategory > 0 && (
                    <span className="svc-category__badge">
                      {selectedInCategory} selecionado{selectedInCategory > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Service Items */}
                <div className="svc-list">
                  {categoryServices.map((service) => {
                    const isSelected = selectedIds.includes(service.id);
                    const isAnimating = animatingId === service.id;

                    return (
                      <button
                        key={service.id}
                        className={`svc-item${isSelected ? ' svc-item--selected' : ''}${isAnimating ? ' svc-item--animating' : ''}`}
                        onClick={() => toggleService(service.id)}
                        type="button"
                      >
                        {/* Left: Check indicator */}
                        <div className="svc-item__check">
                          {isSelected ? (
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <div className="svc-item__check-empty" />
                          )}
                        </div>

                        {/* Center: Service info */}
                        <div className="svc-item__body">
                          <span className="svc-item__name">{service.name}</span>
                          <div className="svc-item__meta">
                            <span className="svc-item__duration">
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                              </svg>
                              {formatDuration(service.durationMin)}
                            </span>
                            <span className="svc-item__sep">·</span>
                            <span className="svc-item__hint">a partir de</span>
                          </div>
                        </div>

                        {/* Right: Price */}
                        <div className="svc-item__price-wrap">
                          <span className="svc-item__price">{formatPrice(service.basePrice)}</span>
                          {isSelected && <span className="svc-item__price-label">adicionado</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty padding for summary bar */}
        {selectedIds.length > 0 && <div style={{ height: 100 }} />}
      </div>

      {/* Floating Summary Bar */}
      {selectedIds.length > 0 && (
        <div className="svc-summary">
          <div className="svc-summary__inner">
            <div className="svc-summary__left">
              <div className="svc-summary__chips">
                {selectedServices.slice(0, 2).map((s) => (
                  <span key={s.id} className="svc-summary__chip">
                    {s.name}
                  </span>
                ))}
                {selectedServices.length > 2 && (
                  <span className="svc-summary__chip svc-summary__chip--more">
                    +{selectedServices.length - 2}
                  </span>
                )}
              </div>
              <div className="svc-summary__totals">
                <span className="svc-summary__price">{formatPrice(totalPrice)}</span>
                <span className="svc-summary__time">⏱ {formatDuration(totalDurationMin)}</span>
              </div>
            </div>
            <button className="svc-summary__btn" onClick={handleContinue}>
              Escolher Horário
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
