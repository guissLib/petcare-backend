import { BadGatewayException, Injectable } from '@nestjs/common';

export const BOOKING_AVAILABILITY_CLIENT = Symbol(
  'BOOKING_AVAILABILITY_CLIENT',
);

export interface BookingAvailabilityClient {
  availability(
    providerId: string,
    date: string,
    capacity: number,
  ): Promise<AvailabilityResponse>;
}

export interface AvailabilityResponse {
  providerId: string;
  date: string;
  available: boolean;
  capacity: number;
  booked: number;
  slots: { start: string; end: string; remaining: number }[];
}

@Injectable()
export class BookingAvailabilityHttpClient implements BookingAvailabilityClient {
  private readonly baseUrl = (
    process.env.BOOKING_SERVICE_URL ?? 'http://localhost:3011/api'
  ).replace(/\/$/, '');

  async availability(providerId: string, date: string, capacity: number) {
    return this.request<AvailabilityResponse>(
      `/internal/providers/${encodeURIComponent(providerId)}/availability?date=${encodeURIComponent(date)}&capacity=${capacity}`,
    );
  }

  private async request<T>(path: string) {
    const headers = new Headers({
      Accept: 'application/json',
      'x-booking-internal-secret': bookingInternalSecret(),
    });
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method: 'GET',
        headers,
      });
    } catch {
      throw new BadGatewayException(
        'No se pudo conectar con booking-service para consultar disponibilidad',
      );
    }
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      throw new BadGatewayException(readErrorMessage(body));
    }
    return body as T;
  }
}

function bookingInternalSecret() {
  return (
    process.env.BOOKING_INTERNAL_SECRET ??
    (process.env.NODE_ENV === 'production' ? '' : 'booking-local-internal')
  );
}

function readErrorMessage(body: unknown) {
  if (
    body &&
    typeof body === 'object' &&
    'message' in body &&
    typeof body.message === 'string'
  ) {
    return body.message;
  }
  return 'booking-service no pudo completar la solicitud';
}
