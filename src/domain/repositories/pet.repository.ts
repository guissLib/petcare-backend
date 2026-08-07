import type { Pet } from '../entities/pet.entity';

export const PET_REPOSITORY = Symbol('PET_REPOSITORY');

export interface PetRepository {
  save(pet: Pet): Promise<void>;
  findById(id: string): Promise<Pet | null>;
  findByOwnerId(ownerId: string): Promise<Pet[]>;
}
