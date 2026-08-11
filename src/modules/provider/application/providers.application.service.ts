import { Inject, Injectable } from '@nestjs/common';
import { EntityNotFoundError } from '../../shared-kernel/domain/shared/errors/domain-error';
import { PROVIDER_REPOSITORY } from '../domain/repositories/provider.repository';
import type { ProviderRepository } from '../domain/repositories/provider.repository';
import {
  BOOKING_AVAILABILITY_CLIENT,
  type BookingAvailabilityClient,
} from '../../shared-kernel/infrastructure/integrations/booking-availability.client';
import type { ServiceType } from '../../shared-kernel/domain/shared/types';
import {
  optionalText,
  required,
  text,
  type Input,
} from '../../shared-kernel/application/shared/application.utils';

@Injectable()
export class ProvidersApplicationService {
  constructor(
    @Inject(PROVIDER_REPOSITORY)
    private readonly providers: ProviderRepository,
    @Inject(BOOKING_AVAILABILITY_CLIENT)
    private readonly bookingService: BookingAvailabilityClient,
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
    return this.bookingService.availability(
      providerId,
      text(query, 'date'),
      provider.capacity,
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
    'cleaning',
  ].includes(value);
}
