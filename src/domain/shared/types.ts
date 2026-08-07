export type UserRole = 'pet-owner' | 'provider' | 'administrator';
export type PetSpecies = 'dog' | 'cat' | 'bird' | 'other';
export type ProviderType = 'employee' | 'contractor' | 'franchise';
export type ServiceType =
  'grooming' | 'walking' | 'boarding' | 'veterinary' | 'home-visit';
export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'rejected'
  | 'in-progress'
  | 'completed'
  | 'cancelled';
export type PaymentMethod = 'online' | 'at-location';
export type PaymentStatus = 'paid' | 'pending' | 'failed';

export interface Schedule {
  dayOfWeek: number;
  start: string;
  end: string;
}

export interface VaccinationRecord {
  id: string;
  vaccine: string;
  administeredAt: string;
  expiresAt?: string;
  documentUrl?: string;
}

export interface UserPrimitives {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  passwordHash: string;
  city?: string;
  phone?: string;
  createdAt: string;
}

export interface PetPrimitives {
  id: string;
  ownerId: string;
  name: string;
  species: PetSpecies;
  breed?: string;
  weightKg?: number;
  specialHandling?: string;
  vaccinationRecords: VaccinationRecord[];
}

export interface ProviderPrimitives {
  id: string;
  operatorUserId?: string;
  name: string;
  type: ProviderType;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  capacity: number;
  acceptsHomeVisits: boolean;
  services: ServiceType[];
  schedule: Schedule[];
}

export interface PromotionPrimitives {
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

export interface PaymentPrimitives {
  id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  currency: string;
  provider: 'mock';
  reference: string;
  createdAt: string;
}

export interface BookingPrimitives {
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
  currency: string;
  paymentMethod: PaymentMethod;
  paymentId: string;
  promotionId?: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface NotificationPrimitives {
  id: string;
  userId: string;
  bookingId?: string;
  type: 'confirmation' | 'reminder' | 'completion' | 'rejection';
  message: string;
  channel: 'mock-push';
  sentAt: string;
  read: boolean;
}
