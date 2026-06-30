// ============================================
// WhatsApp Integration - Beauty Salon
// ============================================

const SALON_PHONE = process.env.NEXT_PUBLIC_SALON_PHONE || '5545998098192';
const SALON_NAME = process.env.NEXT_PUBLIC_SALON_NAME || 'Beauty Salon';

export interface WhatsAppMessageData {
  uniqueCode: string;
  clientName: string;
  clientPhone: string;
  services: string[];
  totalEstimated: number;
  totalDurationMin: number;
  date: string;
  startTime: string;
  endTime: string;
}

/**
 * Formats duration in minutes to a human-readable string
 * e.g., 90 -> "1h 30m", 40 -> "40m", 120 -> "2h"
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Formats price in BRL
 * e.g., 145.00 -> "R$ 145,00"
 */
export function formatPrice(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

/**
 * Generates a WhatsApp message URL for the salon owner
 */
export function generateWhatsAppLink(data: WhatsAppMessageData): string {
  const message = `📋 *NOVO AGENDAMENTO - ${SALON_NAME}*
━━━━━━━━━━━━━━━━━━
🆔 ID: ${data.uniqueCode}
👤 Nome: ${data.clientName}
📱 Telefone: ${data.clientPhone}
💇 Serviços: ${data.services.join(', ')}
💰 Valor Estimado: ${formatPrice(data.totalEstimated)}
⏱️ Tempo Total: ${formatDuration(data.totalDurationMin)}
📅 Data: ${data.date}
⏰ Horário: ${data.startTime} às ${data.endTime}
━━━━━━━━━━━━━━━━━━
`;

  const encoded = encodeURIComponent(message);
  return `https://wa.me/${SALON_PHONE}?text=${encoded}`;
}

/**
 * Returns the formatted phone number for display
 */
export function getSalonPhone(): string {
  return SALON_PHONE;
}

export function getSalonName(): string {
  return SALON_NAME;
}
