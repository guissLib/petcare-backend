import { PetcareState } from '../../domains/shared/petcare-state';

export const PETCARE_PERSISTENCE = Symbol('PETCARE_PERSISTENCE');

export interface PetcarePersistence {
  isAvailable(): boolean;
  load(): Promise<Partial<PetcareState> | null>;
  save(state: PetcareState): Promise<void>;
}
