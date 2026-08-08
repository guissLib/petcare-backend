import { BusinessRuleError } from '../shared/errors/domain-error';
import type { ServiceType } from '../shared/types';

export const SERVICE_BASE_PRICES: Record<ServiceType, number> = {
  grooming: 50000,
  veterinary: 70000,
  walking: 30000,
  boarding: 60000,
  'home-visit': 60000,
  cleaning: 45000,
};

export function basePriceFor(serviceType: ServiceType) {
  const price = SERVICE_BASE_PRICES[serviceType];
  if (!price) {
    throw new BusinessRuleError('No existe un precio para el servicio');
  }
  return price;
}
