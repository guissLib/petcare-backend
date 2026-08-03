import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { PETCARE_PERSISTENCE } from './ports/petcare-persistence.port';
import type { PetcarePersistence } from './ports/petcare-persistence.port';
import {
  createInitialState,
  PetcareState,
} from '../domains/shared/petcare-state';

@Injectable()
export class PetcareStoreService implements OnModuleInit {
  private state: PetcareState = createInitialState();

  constructor(
    @Inject(PETCARE_PERSISTENCE)
    private readonly persistence: PetcarePersistence,
  ) {}

  async onModuleInit() {
    const storedState = await this.persistence.load();
    if (!storedState) return;

    this.state = {
      ...this.state,
      ...storedState,
      users: storedState.users ?? [],
      pets: storedState.pets ?? [],
      bookings: storedState.bookings ?? [],
      notifications: storedState.notifications ?? [],
      promotions: storedState.promotions?.length
        ? storedState.promotions
        : this.state.promotions,
    };
  }

  get data() {
    return this.state;
  }

  get persistenceMode() {
    return this.persistence.isAvailable() ? 'mysql' : 'in-memory-mock';
  }

  async persist() {
    await this.persistence.save(this.state).catch(() => undefined);
  }
}
