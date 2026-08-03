export type PetSpecies = 'dog' | 'cat' | 'bird' | 'other';
export type ProviderType = 'employee' | 'contractor' | 'franchise';
export type ServiceType =
  | 'grooming'
  | 'walking'
  | 'boarding'
  | 'veterinary'
  | 'home-visit';
export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'rejected'
  | 'in-progress'
  | 'completed'
  | 'cancelled';
export type PaymentMethod = 'online' | 'at-location';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  city: string;
  createdAt: string;
}

export interface Pet {
  id: string;
  ownerId: string;
  name: string;
  species: PetSpecies;
  breed?: string;
  weightKg?: number;
  specialHandling?: string;
  vaccinationRecords: VaccinationRecord[];
}

export interface VaccinationRecord {
  id: string;
  vaccine: string;
  administeredAt: string;
  expiresAt?: string;
  documentUrl?: string;
}

export interface Provider {
  id: string;
  name: string;
  type: ProviderType;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  capacity: number;
  acceptsHomeVisits: boolean;
  services: ServiceType[];
  schedule: { dayOfWeek: number; start: string; end: string }[];
}

export interface Promotion {
  id: string;
  name: string;
  description: string;
  discountPercent: number;
  scope: 'national' | 'local';
  city?: string;
  providerId?: string;
  serviceTypes?: ServiceType[];
  startsAt: string;
  endsAt: string;
  active: boolean;
}

export interface Booking {
  id: string;
  userId: string;
  petId: string;
  providerId: string;
  serviceType: ServiceType;
  visitMode: 'pickup-dropoff' | 'home-visit' | 'at-location';
  scheduledAt: string;
  address?: string;
  notes?: string;
  status: BookingStatus;
  total: number;
  paymentMethod: PaymentMethod;
  payment: Payment;
  promotionId?: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  method: PaymentMethod;
  status: 'paid' | 'pending';
  amount: number;
  provider: 'mock';
  reference: string;
}

export interface Notification {
  id: string;
  userId: string;
  bookingId?: string;
  type: 'confirmation' | 'reminder' | 'completion' | 'rejection';
  message: string;
  channel: 'mock-email' | 'mock-push';
  sentAt: string;
  read: boolean;
}
