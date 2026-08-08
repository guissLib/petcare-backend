import { BusinessRuleError } from '../../../shared-kernel/domain/shared/errors/domain-error';
import type {
  ProviderPrimitives,
  ProviderType,
  Schedule,
  ServiceType,
} from '../../../shared-kernel/domain/shared/types';

export interface NewProviderProps {
  id: string;
  operatorUserId?: string;
  name: string;
  type: ProviderType;
  city: string;
  address: string;
  latitude?: number;
  longitude?: number;
  capacity?: number;
  acceptsHomeVisits?: boolean;
  services: ServiceType[];
  schedule?: Schedule[];
}

export class Provider {
  private constructor(private readonly props: ProviderPrimitives) {}

  static create(input: NewProviderProps) {
    if (!input.name?.trim() || !input.city?.trim() || !input.address?.trim()) {
      throw new BusinessRuleError(
        'name, city y address son requeridos para un proveedor',
      );
    }
    if (!input.services?.length) {
      throw new BusinessRuleError(
        'Un proveedor debe ofrecer al menos un servicio',
      );
    }
    if (!['employee', 'contractor', 'franchise'].includes(input.type)) {
      throw new BusinessRuleError('type de proveedor no es válido');
    }
    if (
      input.services.some(
        (service) =>
          ![
            'grooming',
            'walking',
            'boarding',
            'veterinary',
            'home-visit',
            'cleaning',
          ].includes(service),
      )
    ) {
      throw new BusinessRuleError('services contiene un servicio no válido');
    }
    const capacity = input.capacity ?? 1;
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new BusinessRuleError('capacity debe ser un entero positivo');
    }

    return new Provider({
      id: input.id,
      operatorUserId: input.operatorUserId,
      name: input.name.trim(),
      type: input.type,
      city: input.city.trim(),
      address: input.address.trim(),
      latitude: input.latitude ?? 0,
      longitude: input.longitude ?? 0,
      capacity,
      acceptsHomeVisits: input.acceptsHomeVisits ?? false,
      services: [...new Set(input.services)],
      schedule: input.schedule ?? defaultSchedule(),
    });
  }

  static rehydrate(props: ProviderPrimitives) {
    return new Provider({
      ...props,
      services: [...props.services],
      schedule: [...props.schedule],
    });
  }

  offers(service: ServiceType) {
    return this.props.services.includes(service);
  }

  acceptsVisitMode(visitMode: 'pickup-dropoff' | 'home-visit' | 'at-location') {
    return visitMode !== 'home-visit' || this.props.acceptsHomeVisits;
  }

  scheduleFor(date: Date) {
    const dayOfWeek = date.getDay() || 7;
    return this.props.schedule.find(
      (schedule) => schedule.dayOfWeek === dayOfWeek,
    );
  }

  get id() {
    return this.props.id;
  }

  get city() {
    return this.props.city;
  }

  get capacity() {
    return this.props.capacity;
  }

  toPrimitives() {
    return {
      ...this.props,
      services: [...this.props.services],
      schedule: [...this.props.schedule],
    };
  }
}

function defaultSchedule(): Schedule[] {
  return [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
    dayOfWeek,
    start: '08:00',
    end: '18:00',
  }));
}
