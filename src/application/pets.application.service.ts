import { Inject, Injectable } from '@nestjs/common';
import { EntityNotFoundError } from '../domain/shared/errors/domain-error';
import { Pet } from '../domain/entities/pet.entity';
import { PET_REPOSITORY } from '../domain/repositories/pet.repository';
import type { PetRepository } from '../domain/repositories/pet.repository';
import { USER_REPOSITORY } from '../domain/repositories/user.repository';
import type { UserRepository } from '../domain/repositories/user.repository';
import {
  createId,
  required,
  text,
  type Input,
} from './shared/application.utils';

@Injectable()
export class PetsApplicationService {
  constructor(
    @Inject(PET_REPOSITORY)
    private readonly pets: PetRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
  ) {}

  async create(ownerId: string, input: Input) {
    await this.getOwner(ownerId);
    required(input, ['name', 'species']);
    const pet = Pet.create({
      id: createId('pet'),
      ownerId,
      name: text(input, 'name'),
      species: input.species as 'dog' | 'cat' | 'bird' | 'other',
      breed: text(input, 'breed') || undefined,
      weightKg: optionalNumber(input.weightKg),
      specialHandling: text(input, 'specialHandling') || undefined,
    });
    await this.pets.save(pet);
    return pet.toPrimitives();
  }

  async list(ownerId: string) {
    await this.getOwner(ownerId);
    const pets = await this.pets.findByOwnerId(ownerId);
    return pets.map((pet) => pet.toPrimitives());
  }

  async addVaccination(petId: string, input: Input) {
    const pet = await this.getPet(petId);
    required(input, ['vaccine', 'administeredAt']);
    pet.addVaccination({
      id: createId('vax'),
      vaccine: text(input, 'vaccine'),
      administeredAt: text(input, 'administeredAt'),
      expiresAt: text(input, 'expiresAt') || undefined,
      documentUrl: text(input, 'documentUrl') || undefined,
    });
    await this.pets.save(pet);
    return pet.toPrimitives();
  }

  private async getOwner(ownerId: string) {
    const user = await this.users.findById(ownerId);
    if (!user) {
      throw new EntityNotFoundError('Usuario no encontrado');
    }
    return user;
  }

  private async getPet(petId: string) {
    const pet = await this.pets.findById(petId);
    if (!pet) {
      throw new EntityNotFoundError('Mascota no encontrada');
    }
    return pet;
  }
}

function optionalNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}
