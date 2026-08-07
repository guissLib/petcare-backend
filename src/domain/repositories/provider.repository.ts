import type { Provider } from '../entities/provider.entity';

export const PROVIDER_REPOSITORY = Symbol('PROVIDER_REPOSITORY');

export interface ProviderRepository {
  save(provider: Provider): Promise<void>;
  findById(id: string): Promise<Provider | null>;
  findAll(): Promise<Provider[]>;
}
