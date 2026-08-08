import { BusinessRuleError } from '../../../shared-kernel/domain/shared/errors/domain-error';
import type { Pet } from '../../../pet/domain/entities/pet.entity';
import type { Provider } from '../../../provider/domain/entities/provider.entity';
import type { ServiceType } from '../../../shared-kernel/domain/shared/types';
import type { Availability } from '../../../provider/domain/services/provider-availability.service';

export class BookingPolicy {
  validate(
    pet: Pet,
    provider: Provider,
    serviceType: ServiceType,
    visitMode: 'pickup-dropoff' | 'home-visit' | 'at-location',
    availability: Availability,
    enforceVaccination = true,
  ) {
    if (!provider.offers(serviceType)) {
      throw new BusinessRuleError('El proveedor no ofrece ese servicio');
    }
    if (!provider.acceptsVisitMode(visitMode)) {
      throw new BusinessRuleError('El proveedor no ofrece visitas a domicilio');
    }
    if (!availability.available) {
      throw new BusinessRuleError(
        'No hay disponibilidad para la fecha seleccionada',
      );
    }
    if (
      enforceVaccination &&
      requiresVaccination(serviceType) &&
      !pet.hasCurrentVaccination()
    ) {
      throw new BusinessRuleError(
        'Para este servicio es obligatorio adjuntar el carnet de vacunación.',
      );
    }
  }
}

export function requiresVaccination(serviceType: ServiceType) {
  return ['boarding', 'cleaning', 'grooming'].includes(serviceType);
}
