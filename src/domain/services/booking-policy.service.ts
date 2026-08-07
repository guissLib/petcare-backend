import { BusinessRuleError } from '../shared/errors/domain-error';
import type { Pet } from '../entities/pet.entity';
import type { Provider } from '../entities/provider.entity';
import type { ServiceType } from '../shared/types';
import type { Availability } from './provider-availability.service';

export class BookingPolicy {
  validate(
    pet: Pet,
    provider: Provider,
    serviceType: ServiceType,
    visitMode: 'pickup-dropoff' | 'home-visit' | 'at-location',
    availability: Availability,
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
      ['veterinary', 'boarding'].includes(serviceType) &&
      !pet.hasCurrentVaccination()
    ) {
      throw new BusinessRuleError(
        'La mascota requiere una vacuna vigente para este servicio',
      );
    }
  }
}
