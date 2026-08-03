import { Injectable } from '@nestjs/common';
import { Input, stringValue, required } from '../shared/input';

@Injectable()
export class MapsDomainService {
  geocode(input: Input) {
    required(input, ['address', 'city']);
    // Adaptador determinístico de desarrollo; no llama a un proveedor externo.
    const address = stringValue(input, 'address');
    const city = stringValue(input, 'city');
    const seed = [...`${address}${city}`].reduce(
      (sum, character) => sum + character.charCodeAt(0),
      0,
    );
    return {
      address,
      city,
      latitude: 4.5 + (seed % 100) / 1000,
      longitude: -74.1 + (seed % 100) / 1000,
      provider: 'mock-map',
    };
  }
}
