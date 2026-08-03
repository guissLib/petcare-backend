import { Injectable, NotFoundException } from '@nestjs/common';
import { PetcareStoreService } from '../../application/petcare-store.service';
import {
  createId,
  Input,
  optionalString,
  read,
  required,
  stringValue,
} from '../shared/input';
import { Pet, PetSpecies } from '../shared/petcare.types';
import { UsersDomainService } from '../users/users.domain.service';

@Injectable()
export class PetsDomainService {
  constructor(
    private readonly store: PetcareStoreService,
    private readonly users: UsersDomainService,
  ) {}

  create(ownerId: string, input: Input) {
    this.users.getById(ownerId);
    required(input, ['name', 'species']);

    const pet: Pet = {
      id: createId('pet'),
      ownerId,
      name: stringValue(input, 'name'),
      species: read<PetSpecies>(input, 'species') as PetSpecies,
      breed: optionalString(input, 'breed'),
      weightKg: read<number>(input, 'weightKg'),
      specialHandling: optionalString(input, 'specialHandling'),
      vaccinationRecords: [],
    };
    this.store.data.pets.push(pet);
    void this.store.persist();
    return pet;
  }

  listByOwner(ownerId: string) {
    this.users.getById(ownerId);
    return this.store.data.pets.filter((pet) => pet.ownerId === ownerId);
  }

  getById(petId: string) {
    const pet = this.store.data.pets.find((item) => item.id === petId);
    if (!pet) throw new NotFoundException('Mascota no encontrada');
    return pet;
  }

  addVaccination(petId: string, input: Input) {
    const pet = this.getById(petId);
    required(input, ['vaccine', 'administeredAt']);
    pet.vaccinationRecords.push({
      id: createId('vax'),
      vaccine: stringValue(input, 'vaccine'),
      administeredAt: stringValue(input, 'administeredAt'),
      expiresAt: optionalString(input, 'expiresAt'),
      documentUrl: optionalString(input, 'documentUrl'),
    });
    void this.store.persist();
    return pet;
  }
}
