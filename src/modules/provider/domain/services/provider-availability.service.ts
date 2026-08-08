import { BusinessRuleError } from '../../../shared-kernel/domain/shared/errors/domain-error';
import type { Booking } from '../../../booking/domain/entities/booking.entity';
import type { Provider } from '../entities/provider.entity';

export interface Availability {
  providerId: string;
  date: string;
  available: boolean;
  capacity: number;
  booked: number;
  slots: { start: string; end: string; remaining: number }[];
}

export class ProviderAvailabilityService {
  calculate(
    provider: Provider,
    dateValue: string,
    bookings: Booking[],
  ): Availability {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
      throw new BusinessRuleError('date debe ser una fecha válida');
    }

    const schedule = provider.scheduleFor(date);
    if (!schedule) {
      return {
        providerId: provider.id,
        date: dateValue,
        available: false,
        capacity: provider.capacity,
        booked: 0,
        slots: [],
      };
    }

    const booked = bookings.filter(
      (booking) =>
        booking.providerId === provider.id &&
        booking.scheduledAt.slice(0, 10) === dateValue.slice(0, 10) &&
        !['pending', 'rejected', 'cancelled'].includes(booking.status),
    ).length;
    const available = booked < provider.capacity;

    return {
      providerId: provider.id,
      date: dateValue,
      available,
      capacity: provider.capacity,
      booked,
      slots: available
        ? [
            {
              start: schedule.start,
              end: schedule.end,
              remaining: provider.capacity - booked,
            },
          ]
        : [],
    };
  }
}
