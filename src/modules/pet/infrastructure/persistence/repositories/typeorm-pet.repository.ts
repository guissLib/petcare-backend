import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pet } from '../../../domain/entities/pet.entity';
import type {
  PetRepository,
  VaccinationDocument,
} from '../../../domain/repositories/pet.repository';
import { PetOrmEntity } from '../entities/pet.orm-entity';
import { PetVaccinationOrmEntity } from '../entities/pet-vaccination.orm-entity';
import {
  optionalText,
  toDate,
  toIso,
} from '../../../../shared-kernel/infrastructure/persistence/orm-mapper.utils';

@Injectable()
export class TypeOrmPetRepository implements PetRepository {
  constructor(
    @InjectRepository(PetOrmEntity)
    private readonly repository: Repository<PetOrmEntity>,
  ) {}

  async save(pet: Pet, document?: VaccinationDocument) {
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
      const existingVaccinations = await vaccinations.find({
        where: { petId: data.id },
      });
      const existingById = new Map(
        existingVaccinations.map((vaccination) => [
          vaccination.id,
          vaccination,
        ]),
      );
      await vaccinations.delete({ petId: data.id });
      if (data.vaccinationRecords.length > 0) {
        await vaccinations.save(
          data.vaccinationRecords.map((record) => {
            const existing = existingById.get(record.id);
            const uploaded =
              document?.vaccinationId === record.id ? document : undefined;
            return {
              id: record.id,
              petId: data.id,
              vaccine: record.vaccine,
              administeredAt: toDate(record.administeredAt),
              expiresAt: record.expiresAt ? toDate(record.expiresAt) : null,
              documentUrl: record.documentUrl ?? null,
              documentBlob: uploaded
                ? Buffer.from(uploaded.content)
                : (existing?.documentBlob ?? null),
              documentMimeType:
                uploaded?.mimeType ??
                record.documentMimeType ??
                existing?.documentMimeType ??
                null,
              documentName:
                uploaded?.originalName ??
                record.documentName ??
                existing?.documentName ??
                null,
              documentSize:
                uploaded?.size ??
                record.documentSize ??
                existing?.documentSize ??
                null,
            };
          }),
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

  async findVaccinationDocument(petId: string, vaccinationId: string) {
    const record = await this.repository.manager
      .getRepository(PetVaccinationOrmEntity)
      .findOne({ where: { petId, id: vaccinationId } });
    if (
      !record?.documentBlob ||
      record.documentMimeType !== 'application/pdf'
    ) {
      return null;
    }
    return {
      vaccinationId: record.id,
      content: new Uint8Array(record.documentBlob),
      mimeType: 'application/pdf' as const,
      originalName: record.documentName ?? 'carnet-vacunacion.pdf',
      size: record.documentSize ?? record.documentBlob.length,
    };
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
      documentMimeType: optionalText(vaccination.documentMimeType),
      documentName: optionalText(vaccination.documentName),
      documentSize: vaccination.documentSize ?? undefined,
    })),
  });
}
