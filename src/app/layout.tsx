import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Beauty Salon - Agendamento Online',
  description:
    'Agende seus serviços de beleza online de forma rápida e prática. Cabelo, manicure e pedicure com horários disponíveis em tempo real.',
  keywords: 'salão de beleza, agendamento, cabelo, manicure, pedicure, beauty salon',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
