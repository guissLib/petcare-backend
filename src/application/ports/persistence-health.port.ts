export const PERSISTENCE_HEALTH = Symbol('PERSISTENCE_HEALTH');

export interface PersistenceHealth {
  isReady(): boolean;
}
