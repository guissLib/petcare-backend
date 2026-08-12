export type ContextSnapshotEventType =
  | 'context.user.upserted'
  | 'context.pet.upserted'
  | 'context.provider.upserted'
  | 'context.promotion.upserted';

export interface ContextUserSnapshot {
  id: string;
  city?: string;
}

export interface ContextPetSnapshot {
  id: string;
  ownerId: string;
  name?: string;
  species?: 'dog' | 'cat' | 'bird' | 'other';
  breed?: string;
  weightKg?: number;
  vaccinationRecords: {
    id: string;
    vaccine: string;
    administeredAt: string;
    expiresAt?: string;
    documentMimeType?: string;
  }[];
}

export interface ContextProviderSnapshot {
  id: string;
  name?: string;
  type?: 'employee' | 'contractor' | 'franchise';
  city: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  capacity: number;
  acceptsHomeVisits: boolean;
  services: string[];
  schedule: { dayOfWeek: number; start: string; end: string }[];
}

export interface ContextPromotionSnapshot {
  id: string;
  name: string;
  description: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  scope: 'national' | 'local';
  city?: string;
  providerId?: string;
  serviceTypes?: string[];
  startsAt: string;
  endsAt: string;
  active: boolean;
}

export interface ContextSnapshotEnvelope<T extends object = object> {
  eventId: string;
  eventType: ContextSnapshotEventType;
  schemaVersion: 1;
  sourceService: 'petcare-backend';
  aggregateType: string;
  aggregateId: string;
  aggregateVersion: number;
  occurredAt: string;
  data: T;
}
