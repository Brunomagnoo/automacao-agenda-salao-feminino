'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import DashboardTab from '@/components/admin/DashboardTab';
import AgendamentosTab from '@/components/admin/AgendamentosTab';
import HorariosTab from '@/components/admin/HorariosTab';
import CaixaTab from '@/components/admin/CaixaTab';
import UsuariosTab from '@/components/admin/UsuariosTab';

type TabKey = 'agendamentos' | 'horarios' | 'caixa' | 'dashboard' | 'usuarios';

export default function AdminPage() {
  const router = useRouter();
  const [isAuthed, setIsAuthed] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        if (data.user.role !== 'ADMIN') {
          router.push('/login');
          return;
        }
        setIsAuthed(true);
      } catch {
        router.push('/login');
      }
    };
    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    router.push('/login');
  };

  if (!isAuthed) {
    return (
      <div className="adm-loading">
        <div className="adm-loading__spinner" />
      </div>
    );
  }

  const tabs: { key: TabKey; label: string; icon: ReactNode }[] = [
    {
      key: 'agendamentos',
      label: 'Agendamentos',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
    {
      key: 'horarios',
      label: 'Horários',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      key: 'caixa',
      label: 'Controle de Caixa',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
    },
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 3v18h18" />
          <rect x="7" y="14" width="4" height="7" />
          <rect x="15" y="5" width="4" height="16" />
        </svg>
      ),
    },
    {
      key: 'usuarios',
      label: 'Contas',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
  ];

  return (
    <div className="adm">
      <header className="adm-header">
        <div className="adm-header__inner">
          <div className="adm-header__left">
            <img src="/icon-40x40.png.png" alt="Logo" className="adm-header__logo" />
            <span className="adm-header__title">Painel Administrativo</span>
          </div>
          <button className="adm-header__logout" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>

      <nav className="adm-nav">
        <div className="adm-nav__inner">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`adm-nav__tab${activeTab === t.key ? ' adm-nav__tab--active' : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <main className="adm-main">
        {activeTab === 'agendamentos' && <AgendamentosTab isAuthed={isAuthed} />}
        {activeTab === 'horarios' && <HorariosTab isAuthed={isAuthed} />}
        {activeTab === 'caixa' && <CaixaTab isAuthed={isAuthed} />}
        {activeTab === 'dashboard' && <DashboardTab isAuthed={isAuthed} />}
        {activeTab === 'usuarios' && <UsuariosTab isAuthed={isAuthed} />}
      </main>
    </div>
  );
}
