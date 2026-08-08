import { Inject, Injectable } from '@nestjs/common';
import {
  AccessDeniedError,
  BusinessRuleError,
  EntityNotFoundError,
} from '../../shared-kernel/domain/shared/errors/domain-error';
import { Pet } from '../domain/entities/pet.entity';
import { PET_REPOSITORY } from '../domain/repositories/pet.repository';
import type {
  PetRepository,
  VaccinationDocument,
} from '../domain/repositories/pet.repository';
import { USER_REPOSITORY } from '../../user/domain/repositories/user.repository';
import type { UserRepository } from '../../user/domain/repositories/user.repository';
import {
  createId,
  required,
  text,
  type Input,
} from '../../shared-kernel/application/shared/application.utils';

const MAX_VACCINATION_PDF_SIZE = 10 * 1024 * 1024;
const INVALID_PDF_MESSAGE =
  'Formato no válido. Por favor, suba el documento únicamente en formato PDF.';

export interface PetActor {
  id: string;
  role: 'pet-owner' | 'provider' | 'administrator';
}

export interface UploadedVaccinationPdf {
  buffer: Uint8Array;
  mimetype: string;
  originalname: string;
  size: number;
}

@Injectable()
export class PetsApplicationService {
  constructor(
    @Inject(PET_REPOSITORY)
    private readonly pets: PetRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
  ) {}

  async create(ownerId: string, input: Input, actor?: PetActor) {
    this.assertOwnerAccess(ownerId, actor);
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
    return this.response(pet);
  }

  async list(ownerId: string, actor?: PetActor) {
    this.assertOwnerAccess(ownerId, actor);
    await this.getOwner(ownerId);
    const pets = await this.pets.findByOwnerId(ownerId);
    return pets.map((pet) => this.response(pet));
  }

  async addVaccination(
    petId: string,
    input: Input,
    file?: UploadedVaccinationPdf,
    actor?: PetActor,
  ) {
    const pet = await this.getPet(petId);
    this.assertPetAccess(pet, actor);
    required(input, ['vaccine', 'administeredAt']);
    const document = file ? this.toDocument(file, '') : undefined;
    const vaccinationId = createId('vax');
    pet.addVaccination({
      id: vaccinationId,
      vaccine: text(input, 'vaccine'),
      administeredAt: text(input, 'administeredAt'),
      expiresAt: text(input, 'expiresAt') || undefined,
      documentUrl: text(input, 'documentUrl') || undefined,
      documentMimeType: document?.mimeType,
      documentName: document?.originalName,
      documentSize: document?.size,
    });
    await this.pets.save(
      pet,
      document ? { ...document, vaccinationId } : undefined,
    );
    return this.response(pet);
  }

  async updateVaccinationDocument(
    petId: string,
    vaccinationId: string,
    file: UploadedVaccinationPdf | undefined,
    actor?: PetActor,
  ) {
    const pet = await this.getPet(petId);
    this.assertPetAccess(pet, actor);
    const document = this.toDocument(file, vaccinationId);
    pet.updateVaccinationDocument(vaccinationId, {
      documentMimeType: document.mimeType,
      documentName: document.originalName,
      documentSize: document.size,
    });
    await this.pets.save(pet, document);
    return this.response(pet);
  }

  async downloadVaccinationDocument(
    petId: string,
    vaccinationId: string,
    actor?: PetActor,
  ) {
    const pet = await this.getPet(petId);
    this.assertPetAccess(pet, actor);
    const document = await this.pets.findVaccinationDocument(
      petId,
      vaccinationId,
    );
    if (!document) {
      throw new EntityNotFoundError('Carnet de vacunación no encontrado');
    }
    return {
      ...document,
      originalName: safeFileName(document.originalName),
    };
  }

  private toDocument(
    file: UploadedVaccinationPdf | undefined,
    vaccinationId: string,
  ): VaccinationDocument {
    if (
      !file ||
      file.mimetype !== 'application/pdf' ||
      file.size <= 0 ||
      file.size > MAX_VACCINATION_PDF_SIZE ||
      !startsWithPdfSignature(file.buffer)
    ) {
      throw new BusinessRuleError(INVALID_PDF_MESSAGE);
    }
    return {
      vaccinationId,
      content: file.buffer,
      mimeType: 'application/pdf',
      originalName: safeFileName(file.originalname),
      size: file.size,
    };
  }

  private response(pet: Pet) {
    const data = pet.toPrimitives();
    return {
      ...data,
      vaccinationRecords: data.vaccinationRecords.map((record) => ({
        ...record,
        documentUrl:
          record.documentMimeType === 'application/pdf'
            ? `/pets/${pet.id}/vaccinations/${record.id}/document`
            : record.documentUrl,
      })),
    };
  }

  private assertOwnerAccess(ownerId: string, actor?: PetActor) {
    if (actor && actor.role === 'pet-owner' && actor.id !== ownerId) {
      throw new AccessDeniedError(
        'No puede administrar mascotas de otro usuario',
      );
    }
    if (actor && actor.role === 'provider') {
      throw new AccessDeniedError('Un proveedor no puede administrar mascotas');
    }
  }

  private assertPetAccess(pet: Pet, actor?: PetActor) {
    if (
      actor &&
      actor.role !== 'administrator' &&
      (actor.role !== 'pet-owner' || actor.id !== pet.ownerId)
    ) {
      throw new AccessDeniedError(
        'Solo el propietario puede administrar el carnet de la mascota',
      );
    }
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

function startsWithPdfSignature(content: Uint8Array) {
  return new TextDecoder().decode(content.slice(0, 5)) === '%PDF-';
}

function safeFileName(fileName: string) {
  const normalized = fileName
    .replace(/[^a-zA-Z0-9._ -]/g, '_')
    .trim()
    .slice(0, 255);
  return normalized || 'carnet-vacunacion.pdf';
}

function optionalNumber(value: unknown) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : undefined;
}
