// ============================================
// Utility Functions - Beauty Salon
// ============================================

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
 * Formats price in BRL currency
 * e.g., 145.00 -> "R$ 145,00"
 */
export function formatPrice(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Formats a date string to Brazilian format
 * e.g., "2026-06-28" -> "28/06/2026"
 */
export function formatDate(dateStr: string): string {
  const parseStr = dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00';
  const date = new Date(parseStr);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formats a Date object to YYYY-MM-DD string for inputs and APIs
 */
export function formatLocalDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formats a date to show weekday name
 * e.g., "2026-06-30" -> "Terça-feira"
 */
export function formatWeekday(dateStr: string): string {
  const parseStr = dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00';
  const date = new Date(parseStr);
  return date.toLocaleDateString('pt-BR', { weekday: 'long' });
}

/**
 * Formats a phone number for display
 * e.g., "66999871535" -> "(66) 99987-1535"
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 13) {
    // +55 prefix
    return `(${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
  }
  return phone;
}

/**
 * Cleans a phone number to only digits (no country code)
 */
export function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, '').replace(/^55/, '');
}

/**
 * Generates a unique salon code like BS-0001
 */
export function generateUniqueCode(sequence: number): string {
  return `BS-${String(sequence).padStart(4, '0')}`;
}

/**
 * Gets the available days of the week (Tuesday=2 to Saturday=6)
 */
export function getWorkingDays(): number[] {
  return [2, 3, 4, 5, 6]; // Terça a Sábado
}

/**
 * Gets day name in Portuguese
 */
export function getDayName(dayIndex: number): string {
  const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  return days[dayIndex];
}

/**
 * Calculates end time given start time and duration in minutes
 * e.g., ("14:00", 90) -> "15:30"
 */
export function calculateEndTime(startTime: string, durationMin: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMin;
  const endHours = Math.floor(totalMinutes / 60);
  const endMins = totalMinutes % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
}

/**
 * Checks if a time range fits within working hours (13:30 - 20:00)
 */
export function fitsInWorkingHours(startTime: string, durationMin: number): boolean {
  const endTime = calculateEndTime(startTime, durationMin);
  const [endH, endM] = endTime.split(':').map(Number);
  const endTotal = endH * 60 + endM;
  const maxTotal = 20 * 60; // 20:00
  return endTotal <= maxTotal;
}

/**
 * Returns the next N working days from today
 */
export function getNextWorkingDays(count: number): string[] {
  const workingDays = getWorkingDays();
  const dates: string[] = [];
  const today = new Date();
  let current = new Date(today);

  while (dates.length < count) {
    current.setDate(current.getDate() + 1);
    if (workingDays.includes(current.getDay())) {
      dates.push(formatLocalDate(current));
    }
  }

  return dates;
}
