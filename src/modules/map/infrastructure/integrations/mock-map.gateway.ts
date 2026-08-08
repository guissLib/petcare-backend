import { Injectable } from '@nestjs/common';
import type { MapGateway } from '../../../shared-kernel/application/ports/integration.ports';

@Injectable()
export class MockMapGateway implements MapGateway {
  geocode(address: string, city: string) {
    const seed = [...`${address}${city}`].reduce(
      (sum, character) => sum + character.charCodeAt(0),
      0,
    );
    return Promise.resolve({
      address,
      city,
      latitude: 4.5 + (seed % 100) / 1000,
      longitude: -74.1 + (seed % 100) / 1000,
      provider: 'mock-map',
    });
  }
}
