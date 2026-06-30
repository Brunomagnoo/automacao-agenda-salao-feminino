import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="landing-page">
      {/* Decorative background blobs */}
      <div className="landing-blob landing-blob--1" />
      <div className="landing-blob landing-blob--2" />

      <div className="landing-content fade-in">
        {/* Logo */}
        <div className="landing-logo">
          <img src="/logo.png" alt="Beauty Salon" />
        </div>

        {/* Tagline */}
        <div className="landing-tag">✨ Agendamento Online</div>

        <h1 className="landing-title">
          Beauty
          <br />
          <span>Salon</span>
        </h1>

        <p className="landing-subtitle">
          Agende seus serviços de beleza de forma rápida e prática, sem espera!
        </p>

        {/* CTA Primary */}
        <Link href="/agendar" className="btn-landing-primary">
          <span>Agendar Agora</span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>

        {/* Secondary links */}
        <div className="landing-links">
          <Link href="/login" className="landing-link">
            Entrar na minha conta
          </Link>
          <span className="landing-link-sep">·</span>
          <Link href="/cadastro" className="landing-link">
            Criar conta grátis
          </Link>
        </div>

        {/* Features */}
        <div className="landing-features">
          <div className="landing-feature">
            <span className="landing-feature__icon">⚡</span>
            <span>Rápido</span>
          </div>
          <div className="landing-feature">
            <span className="landing-feature__icon">🔒</span>
            <span>Seguro</span>
          </div>
          <div className="landing-feature">
            <span className="landing-feature__icon">💅</span>
            <span>Premium</span>
          </div>
        </div>
      </div>
    </main>
  );
}
