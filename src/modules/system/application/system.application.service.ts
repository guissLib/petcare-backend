import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import {
  PERSISTENCE_HEALTH,
  type PersistenceHealth,
} from './ports/persistence-health.port';

@Injectable()
export class SystemApplicationService {
  constructor(
    @Inject(PERSISTENCE_HEALTH)
    private readonly persistenceHealth: PersistenceHealth,
  ) {}

  health() {
    const persistenceReady = this.persistenceHealth.isReady();
    return {
      service: 'petcare-home-services',
      status: persistenceReady ? 'ok' : 'error',
      persistence: 'mysql',
      persistenceReady,
      timestamp: new Date().toISOString(),
    };
  }
}
