import { Injectable } from '@nestjs/common';
import { BusinessRuleError } from '../../../shared-kernel/domain/shared/errors/domain-error';
import type { MapGateway } from '../../../shared-kernel/application/ports/integration.ports';
import { GeoPoint } from '../../../shared-kernel/domain/value-objects/geo-point.vo';

interface GoogleGeocodeResponse {
  status: string;
  error_message?: string;
  results?: Array<{
    formatted_address: string;
    geometry?: {
      location?: {
        lat: number;
        lng: number;
      };
    };
    address_components?: Array<{
      long_name: string;
      types: string[];
    }>;
  }>;
}

@Injectable()
export class GoogleMapsGateway implements MapGateway {
  async geocode(address: string, city: string) {
    const apiKey =
      process.env.GOOGLE_MAPS_SERVER_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new BusinessRuleError(
        'Google Maps no está configurado en el servidor',
      );
    }

    const query = `${address}, ${city}, Bolivia`;
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('address', query);
    url.searchParams.set('components', 'country:BO');
    url.searchParams.set('language', 'es');
    url.searchParams.set('key', apiKey);

    const response = await fetch(url);
    if (!response.ok) {
      throw new BusinessRuleError('No fue posible consultar Google Maps');
    }
    const payload = (await response.json()) as GoogleGeocodeResponse;
    const result = payload.results?.[0];
    const location = result?.geometry?.location;
    if (payload.status !== 'OK' || !result || !location) {
      throw new BusinessRuleError(
        payload.error_message || 'La dirección no pudo ser geocodificada',
      );
    }

    const point = GeoPoint.inBolivia(location.lat, location.lng);
    return {
      address: result.formatted_address,
      city: cityFromComponents(result.address_components) ?? city,
      latitude: point.latitude,
      longitude: point.longitude,
      provider: 'google-maps',
    };
  }
}

function cityFromComponents(
  components: Array<{ long_name: string; types: string[] }> | undefined,
) {
  if (!Array.isArray(components)) {
    return undefined;
  }
  return components.find(
    (component) =>
      component.types.includes('locality') ||
      component.types.includes('administrative_area_level_2'),
  )?.long_name;
}
