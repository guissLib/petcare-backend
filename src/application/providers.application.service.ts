import { Inject, Injectable } from '@nestjs/common';
import { EntityNotFoundError } from '../domain/shared/errors/domain-error';
import { BOOKING_REPOSITORY } from '../domain/repositories/booking.repository';
import type { BookingRepository } from '../domain/repositories/booking.repository';
import { ProviderAvailabilityService } from '../domain/services/provider-availability.service';
import { PROVIDER_REPOSITORY } from '../domain/repositories/provider.repository';
import type { ProviderRepository } from '../domain/repositories/provider.repository';
import type { ServiceType } from '../domain/shared/types';
import {
  optionalText,
  required,
  text,
  type Input,
} from './shared/application.utils';

@Injectable()
export class ProvidersApplicationService {
  private readonly availabilityService = new ProviderAvailabilityService();

  constructor(
    @Inject(PROVIDER_REPOSITORY)
    private readonly providers: ProviderRepository,
    @Inject(BOOKING_REPOSITORY)
    private readonly bookings: BookingRepository,
  ) {}

  async list(query: Input) {
    const city = optionalText(query, 'city')?.toLowerCase();
    const serviceType = optionalText(query, 'serviceType');
    const providers = await this.providers.findAll();
    return providers
      .filter(
        (provider) =>
          (!city || provider.toPrimitives().city.toLowerCase() === city) &&
          (!serviceType ||
            (isServiceType(serviceType) && provider.offers(serviceType))),
      )
      .map((provider) => provider.toPrimitives());
  }

  async getById(providerId: string) {
    const provider = await this.providers.findById(providerId);
    if (!provider) {
      throw new EntityNotFoundError('Proveedor no encontrado');
    }
    return provider;
  }

  async availability(providerId: string, query: Input) {
    required(query, ['date']);
    const provider = await this.getById(providerId);
    const bookings = await this.bookings.findAll();
    return this.availabilityService.calculate(
      provider,
      text(query, 'date'),
      bookings,
    );
  }
}

function isServiceType(value: string): value is ServiceType {
  return [
    'grooming',
    'walking',
    'boarding',
    'veterinary',
    'home-visit',
  ].includes(value);
}
