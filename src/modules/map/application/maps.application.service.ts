import { Inject, Injectable } from '@nestjs/common';
import { BusinessRuleError } from '../../shared-kernel/domain/shared/errors/domain-error';
import { GeoPoint } from '../../shared-kernel/domain/value-objects/geo-point.vo';
import { PETCARE_MAP_GATEWAY } from '../../shared-kernel/application/ports/integration.ports';
import type { MapGateway } from '../../shared-kernel/application/ports/integration.ports';
import {
  required,
  text,
  type Input,
} from '../../shared-kernel/application/shared/application.utils';

@Injectable()
export class MapsApplicationService {
  constructor(
    @Inject(PETCARE_MAP_GATEWAY)
    private readonly maps: MapGateway,
  ) {}

  async geocode(input: Input) {
    required(input, ['address', 'city']);
    const address = text(input, 'address');
    const city = text(input, 'city');
    if (!address || !city) {
      throw new BusinessRuleError('address y city son requeridos');
    }
    const result = await this.maps.geocode(address, city);
    GeoPoint.inBolivia(result.latitude, result.longitude);
    return result;
  }

  publicConfig() {
    return {
      provider: 'google-maps',
      apiKey:
        process.env.GOOGLE_MAPS_BROWSER_API_KEY ??
        process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ??
        '',
    };
  }
}
