'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

export default function CadastroPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneValid, setPhoneValid] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Format phone as (XX) XXXXX-XXXX or (XX) XXXX-XXXX
  function formatPhone(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 10) {
      return digits
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');
  }

  // Brazilian mobile: DDD 11–99, mobile starts with 9 (11 digits) or landline (10 digits)
  function isValidBrazilianPhone(digits: string): boolean {
    if (digits.length === 11) {
      // Mobile: DDD (11–99) + 9 + 8 digits
      return /^([1-9]{1}[1-9]{1})(9\d{8})$/.test(digits);
    }
    if (digits.length === 10) {
      // Landline: DDD (11–99) + 2–5 + 7 digits
      return /^([1-9]{1}[1-9]{1})([2-5]\d{7})$/.test(digits);
    }
    return false;
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
    const digits = formatted.replace(/\D/g, '');
    if (digits.length >= 10) {
      setPhoneValid(isValidBrazilianPhone(digits));
    } else {
      setPhoneValid(null);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name || !phone || !password || !confirmPassword) {
      setError('Preencha todos os campos');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    if (!isValidBrazilianPhone(cleanPhone)) {
      setError('Número de celular inválido. Use o formato (XX) XXXXX-XXXX com DDD.');
      setPhoneValid(false);
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone: cleanPhone, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao criar conta');
        setLoading(false);
        return;
      }
      setSuccess('Conta criada com sucesso! Redirecionando...');
      setTimeout(() => router.push('/login'), 1500);
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
        <div className="auth-logo-wrap">
          <img src="/icon-150x150.png.png" alt="Beauty Salon" />
        </div>

        <h1 className="auth-title">Criar conta</h1>
        <p className="auth-subtitle">Junte-se ao Beauty Salon</p>

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
        {success && <div className="auth-success">✅ {success}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="name">👤 Nome completo</label>
            <input
              id="name"
              type="text"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="phone">📱 Celular</label>
            <input
              id="phone"
              type="tel"
              placeholder="(11) 99999-0000"
              value={phone}
              onChange={handlePhoneChange}
              inputMode="numeric"
              maxLength={15}
              style={{
                borderColor:
                  phoneValid === null ? undefined : phoneValid ? '#22c55e' : '#ef4444',
                outline: 'none',
              }}
              required
            />
            {phoneValid === false && (
              <span style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>
                Número inválido. Ex: (11) 99999-0000
              </span>
            )}
            {phoneValid === true && (
              <span style={{ color: '#22c55e', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>
                ✓ Número válido
              </span>
            )}
          </div>

          <div className="auth-field">
            <label htmlFor="password">🔒 Senha</label>
            <div className="auth-field__password">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
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
          </div>

          <div className="auth-field">
            <label htmlFor="confirmPassword">🔒 Confirmar senha</label>
            <div className="auth-field__password">
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="Repita a senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-auth-primary" disabled={loading}>
            {loading ? (
              <>
                <span className="auth-spinner" />
                Criando conta...
              </>
            ) : (
              'Criar Conta'
            )}
          </button>
        </form>

        <div className="auth-footer">
          Já tem conta? <Link href="/login">Entrar</Link>
        </div>
      </div>
    </div>
  );
}
