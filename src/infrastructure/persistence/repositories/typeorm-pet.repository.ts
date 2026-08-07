import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pet } from '../../../domain/entities/pet.entity';
import type { PetRepository } from '../../../domain/repositories/pet.repository';
import { PetOrmEntity } from '../entities/pet.orm-entity';
import { PetVaccinationOrmEntity } from '../entities/pet-vaccination.orm-entity';
import { optionalText, toDate, toIso } from './orm-mapper.utils';

@Injectable()
export class TypeOrmPetRepository implements PetRepository {
  constructor(
    @InjectRepository(PetOrmEntity)
    private readonly repository: Repository<PetOrmEntity>,
  ) {}

  async save(pet: Pet) {
    const data = pet.toPrimitives();
    await this.repository.manager.transaction(async (manager) => {
      await manager.getRepository(PetOrmEntity).save({
        id: data.id,
        ownerId: data.ownerId,
        name: data.name,
        species: data.species,
        breed: data.breed ?? null,
        weightKg: data.weightKg?.toString() ?? null,
        specialHandling: data.specialHandling ?? null,
      });

      const vaccinations = manager.getRepository(PetVaccinationOrmEntity);
      await vaccinations.delete({ petId: data.id });
      if (data.vaccinationRecords.length > 0) {
        await vaccinations.save(
          data.vaccinationRecords.map((record) => ({
            id: record.id,
            petId: data.id,
            vaccine: record.vaccine,
            administeredAt: toDate(record.administeredAt),
            expiresAt: record.expiresAt ? toDate(record.expiresAt) : null,
            documentUrl: record.documentUrl ?? null,
          })),
        );
      }
    });
  }

  async findById(id: string) {
    const record = await this.repository.findOne({
      where: { id },
      relations: { vaccinations: true },
    });
    return record ? toDomain(record) : null;
  }

  async findByOwnerId(ownerId: string) {
    const records = await this.repository.find({
      where: { ownerId },
      relations: { vaccinations: true },
      order: { name: 'ASC' },
    });
    return records.map(toDomain);
  }
}

function toDomain(record: PetOrmEntity) {
  return Pet.rehydrate({
    id: record.id,
    ownerId: record.ownerId,
    name: record.name,
    species: record.species as 'dog' | 'cat' | 'bird' | 'other',
    breed: optionalText(record.breed),
    weightKg: record.weightKg === null ? undefined : Number(record.weightKg),
    specialHandling: optionalText(record.specialHandling),
    vaccinationRecords: (record.vaccinations ?? []).map((vaccination) => ({
      id: vaccination.id,
      vaccine: vaccination.vaccine,
      administeredAt: toIso(vaccination.administeredAt),
      expiresAt: vaccination.expiresAt
        ? toIso(vaccination.expiresAt)
        : undefined,
      documentUrl: optionalText(vaccination.documentUrl),
    })),
  });
}
