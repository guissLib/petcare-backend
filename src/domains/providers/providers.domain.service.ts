import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PetcareStoreService } from '../../application/petcare-store.service';
import { Input, optionalString, stringValue, required } from '../shared/input';
import { Provider } from '../shared/petcare.types';

@Injectable()
export class ProvidersDomainService {
  private readonly providers: Provider[] = [
    {
      id: 'provider_centro',
      name: 'PetCare Centro',
      type: 'employee',
      city: 'Bogotá',
      address: 'Calle 100 # 12-30',
      latitude: 4.676,
      longitude: -74.048,
      capacity: 8,
      acceptsHomeVisits: true,
      services: ['grooming', 'veterinary', 'walking', 'home-visit'],
      schedule: [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
        dayOfWeek,
        start: '08:00',
        end: '18:00',
      })),
    },
    {
      id: 'provider_norte',
      name: 'PetCare Norte',
      type: 'franchise',
      city: 'Medellín',
      address: 'Carrera 43A # 10-20',
      latitude: 6.208,
      longitude: -75.567,
      capacity: 5,
      acceptsHomeVisits: false,
      services: ['grooming', 'boarding', 'veterinary'],
      schedule: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
        dayOfWeek,
        start: '09:00',
        end: '17:00',
      })),
    },
  ];

  constructor(private readonly store: PetcareStoreService) {}

  list(query: Input) {
    const city = optionalString(query, 'city');
    const serviceType = optionalString(query, 'serviceType') as
      Provider['services'][number] | undefined;
    return this.providers.filter(
      (provider) =>
        (!city || provider.city.toLowerCase() === city.toLowerCase()) &&
        (!serviceType || provider.services.includes(serviceType)),
    );
  }

  getById(providerId: string) {
    const provider = this.providers.find((item) => item.id === providerId);
    if (!provider) throw new NotFoundException('Proveedor no encontrado');
    return provider;
  }

  availability(providerId: string, query: Input) {
    const provider = this.getById(providerId);
    required(query, ['date']);
    const dateValue = stringValue(query, 'date');
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('date debe ser una fecha válida');
    }

    const dayOfWeek = date.getDay() || 7;
    const schedule = provider.schedule.find(
      (item) => item.dayOfWeek === dayOfWeek,
    );
    if (!schedule)
      return { providerId, date: dateValue, available: false, slots: [] };

    const booked = this.store.data.bookings.filter(
      (booking) =>
        booking.providerId === providerId &&
        booking.scheduledAt.startsWith(dateValue) &&
        !['rejected', 'cancelled'].includes(booking.status),
    ).length;

    return {
      providerId,
      date: dateValue,
      available: booked < provider.capacity,
      capacity: provider.capacity,
      booked,
      slots:
        booked < provider.capacity
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
