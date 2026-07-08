// ============================================
// Beauty Salon - Type Definitions
// ============================================

export interface User {
  id: string;
  uniqueCode: string;
  name: string;
  phone: string;
  role: 'CLIENT' | 'ADMIN';
  // C-02: removed `createdAt` — not returned by /api/auth/me
}

export interface Service {
  id: string;
  name: string;
  category: 'CABELO' | 'MANICURE';
  durationMin: number;
  basePrice: number;
  isActive: boolean;
  // C-03: fixed — Prisma schema uses `displayOrder`, not `order`
  displayOrder: number;
}

export interface TimeSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface Appointment {
  id: string;
  userId: string;
  user?: User;
  timeSlotId: string;
  timeSlot?: TimeSlot;
  totalEstimated: number;
  totalDurationMin: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  createdAt: string;
  services?: AppointmentService[];
}

export interface AppointmentService {
  id: string;
  appointmentId: string;
  serviceId: string;
  service?: Service;
}

// ============================================
// API Request/Response Types
// ============================================

export interface RegisterRequest {
  name: string;
  phone: string;
  password: string;
}

export interface LoginRequest {
  phone: string;
  password: string;
}

export interface AuthResponse {
  // C-02: removed `token` — auth uses httpOnly cookie, not a token in the response body
  user: User;
}

export interface CreateAppointmentRequest {
  serviceIds: string[];
  timeSlotId: string;
  // S-09: totalEstimated and totalDurationMin are now calculated server-side
}

export interface CreateTimeSlotsRequest {
  date: string;
  slots: { startTime: string; endTime: string }[];
}

export interface ApiError {
  error: string;
  message: string;
}

// ============================================
// Frontend State Types
// ============================================

export interface SelectedService extends Service {
  selected: boolean;
}

export interface BookingSummary {
  services: Service[];
  totalPrice: number;
  totalDurationMin: number;
  timeSlot?: TimeSlot;
}
