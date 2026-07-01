'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao fazer login');
        setLoading(false);
        return;
      }
      localStorage.setItem('beauty-salon-user', JSON.stringify(data.user));
      if (data.user.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/agendar');
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
      setLoading(false);
    }
  }

  return (
    <div className="auth-page-new">
      <div className="auth-blob auth-blob--1" />
      <div className="auth-blob auth-blob--2" />

      <div className="auth-card-new fade-in">
        {/* Logo */}
        <div className="auth-logo-wrap">
          <img src="/icon-150x150.png.png" alt="Beauty Salon" />
        </div>

        <h1 className="auth-title">Bem-vinda de volta!</h1>
        <p className="auth-subtitle">Entre na sua conta para agendar</p>

        {error && (
          <div className="auth-error">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="phone">📱 Telefone</label>
            <input
              id="phone"
              type="tel"
              placeholder="(00) 00000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">🔒 Senha</label>
            <div className="auth-field__password">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="auth-field__toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            <div style={{ textAlign: 'right', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  if (!phone || phone.length < 8) {
                    setError('Digite seu telefone primeiro para recuperar a senha.');
                    return;
                  }
                  const text = encodeURIComponent(`Olá! Esqueci minha senha no aplicativo. Meu telefone de cadastro é ${phone}. Pode resetar minha senha?`);
                  // Use a fixed salon number or a placeholder. Assuming +55 11 99999-9999 as a placeholder
                  window.open(`https://wa.me/5511999999999?text=${text}`, '_blank');
                }}
                style={{
                  background: 'none', border: 'none', color: 'var(--color-primary)', 
                  fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: 0
                }}
              >
                Esqueci minha senha
              </button>
            </div>
          </div>

          <button type="submit" className="btn-auth-primary" disabled={loading}>
            {loading ? (
              <>
                <span className="auth-spinner" />
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </button>
        </form>

        <div className="auth-footer">
          Não tem conta? <Link href="/cadastro">Criar conta grátis</Link>
        </div>
      </div>
    </div>
  );
}
