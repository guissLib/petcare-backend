import { BusinessRuleError } from '../shared/errors/domain-error';
import type {
  PetPrimitives,
  PetSpecies,
  VaccinationRecord,
} from '../shared/types';

export interface NewPetProps {
  id: string;
  ownerId: string;
  name: string;
  species: PetSpecies;
  breed?: string;
  weightKg?: number;
  specialHandling?: string;
}

export class Pet {
  private constructor(private readonly props: PetPrimitives) {}

  static create(input: NewPetProps) {
    if (!input.name?.trim()) {
      throw new BusinessRuleError('name es requerido');
    }
    if (!input.ownerId) {
      throw new BusinessRuleError('ownerId es requerido');
    }
    if (!['dog', 'cat', 'bird', 'other'].includes(input.species)) {
      throw new BusinessRuleError('species no es válido');
    }
    if (
      input.weightKg !== undefined &&
      (!Number.isFinite(input.weightKg) || input.weightKg <= 0)
    ) {
      throw new BusinessRuleError('weightKg debe ser positivo');
    }

    return new Pet({
      ...input,
      name: input.name.trim(),
      vaccinationRecords: [],
    });
  }

  static rehydrate(props: PetPrimitives) {
    return new Pet({
      ...props,
      vaccinationRecords: [...props.vaccinationRecords],
    });
  }

  addVaccination(record: VaccinationRecord) {
    if (!record.vaccine?.trim() || !record.administeredAt) {
      throw new BusinessRuleError('vaccine y administeredAt son requeridos');
    }
    const administeredAt = new Date(record.administeredAt);
    if (Number.isNaN(administeredAt.getTime())) {
      throw new BusinessRuleError('administeredAt debe ser una fecha válida');
    }
    if (
      record.expiresAt &&
      Number.isNaN(new Date(record.expiresAt).getTime())
    ) {
      throw new BusinessRuleError('expiresAt debe ser una fecha válida');
    }
    this.props.vaccinationRecords.push({
      ...record,
      vaccine: record.vaccine.trim(),
    });
  }

  hasCurrentVaccination(referenceDate = new Date()) {
    return this.props.vaccinationRecords.some(
      (record) =>
        !record.expiresAt ||
        new Date(record.expiresAt).getTime() >= referenceDate.getTime(),
    );
  }

  get id() {
    return this.props.id;
  }

  get ownerId() {
    return this.props.ownerId;
  }

  toPrimitives() {
    return {
      ...this.props,
      vaccinationRecords: [...this.props.vaccinationRecords],
    };
  }
}
