import type {
  ContextPetSnapshot,
  ContextPromotionSnapshot,
  ContextProviderSnapshot,
  ContextUserSnapshot,
} from './context-snapshot.types';

export function toContextUserSnapshot(input: {
  id: string;
  city?: string;
}): ContextUserSnapshot {
  return {
    id: input.id,
    ...(input.city ? { city: input.city } : {}),
  };
}

export function toContextPetSnapshot(input: {
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
}): ContextPetSnapshot {
  return {
    id: input.id,
    ownerId: input.ownerId,
    ...(input.name ? { name: input.name } : {}),
    ...(input.species ? { species: input.species } : {}),
    ...(input.breed ? { breed: input.breed } : {}),
    ...(input.weightKg !== undefined ? { weightKg: input.weightKg } : {}),
    vaccinationRecords: input.vaccinationRecords.map((record) => ({
      id: record.id,
      vaccine: record.vaccine,
      administeredAt: record.administeredAt,
      ...(record.expiresAt ? { expiresAt: record.expiresAt } : {}),
      ...(record.documentMimeType
        ? { documentMimeType: record.documentMimeType }
        : {}),
    })),
  };
}

export function toContextProviderSnapshot(input: {
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
}): ContextProviderSnapshot {
  return {
    id: input.id,
    ...(input.name ? { name: input.name } : {}),
    ...(input.type ? { type: input.type } : {}),
    city: input.city,
    ...(input.address ? { address: input.address } : {}),
    ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
    ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
    capacity: input.capacity,
    acceptsHomeVisits: input.acceptsHomeVisits,
    services: [...input.services],
    schedule: input.schedule.map((entry) => ({ ...entry })),
  };
}

export function toContextPromotionSnapshot(
  input: ContextPromotionSnapshot,
): ContextPromotionSnapshot {
  return {
    id: input.id,
    name: input.name,
    description: input.description,
    discountType: input.discountType,
    discountValue: input.discountValue,
    scope: input.scope,
    ...(input.city ? { city: input.city } : {}),
    ...(input.providerId ? { providerId: input.providerId } : {}),
    ...(input.serviceTypes ? { serviceTypes: [...input.serviceTypes] } : {}),
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    active: input.active,
  };
}
