import { Inject, Injectable } from '@nestjs/common';
import { BusinessRuleError } from '../domain/shared/errors/domain-error';
import { PETCARE_MAP_GATEWAY } from './ports/integration.ports';
import type { MapGateway } from './ports/integration.ports';
import { required, text, type Input } from './shared/application.utils';

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
    return this.maps.geocode(address, city);
  }
}
