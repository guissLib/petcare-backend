import type { Pet } from '../entities/pet.entity';

export const PET_REPOSITORY = Symbol('PET_REPOSITORY');

export interface VaccinationDocument {
  vaccinationId: string;
  content: Uint8Array;
  mimeType: 'application/pdf';
  originalName: string;
  size: number;
}

export interface PetRepository {
  save(pet: Pet, document?: VaccinationDocument): Promise<void>;
  findById(id: string): Promise<Pet | null>;
  findByOwnerId(ownerId: string): Promise<Pet[]>;
  findVaccinationDocument(
    petId: string,
    vaccinationId: string,
  ): Promise<VaccinationDocument | null>;
}
