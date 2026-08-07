import { BusinessRuleError } from '../shared/errors/domain-error';
import type {
  BookingPrimitives,
  BookingStatus,
  PaymentMethod,
  ServiceType,
} from '../shared/types';
import type { DomainEvent } from '../events/domain-event';
import { BookingCreatedDomainEvent } from '../events/booking-created.domain-event';

export interface NewBookingProps {
  id: string;
  userId: string;
  petId: string;
  providerId: string;
  serviceType: ServiceType;
  visitMode: 'pickup-dropoff' | 'home-visit' | 'at-location';
  scheduledAt: string;
  address?: string;
  notes?: string;
  total: number;
  paymentMethod: PaymentMethod;
  paymentId: string;
  promotionId?: string;
  createdAt: string;
}

export class Booking {
  private constructor(
    private readonly props: BookingPrimitives,
    private readonly domainEvents: DomainEvent[] = [],
  ) {}

  static create(input: NewBookingProps) {
    if (
      !input.scheduledAt ||
      Number.isNaN(new Date(input.scheduledAt).getTime())
    ) {
      throw new BusinessRuleError('scheduledAt debe ser una fecha válida');
    }
    if (input.visitMode === 'home-visit' && !input.address?.trim()) {
      throw new BusinessRuleError(
        'address es requerido para visita a domicilio',
      );
    }
    if (!input.paymentId) {
      throw new BusinessRuleError('paymentId es requerido');
    }

    const booking = new Booking({
      ...input,
      status: 'confirmed',
      currency: 'COP',
      address: input.address?.trim(),
    });
    booking.domainEvents.push(
      new BookingCreatedDomainEvent(
        booking.id,
        booking.userId,
        booking.providerId,
        booking.toPrimitives().paymentId,
      ),
    );
    return booking;
  }

  static rehydrate(props: BookingPrimitives) {
    return new Booking(props);
  }

  pullDomainEvents() {
    const events = [...this.domainEvents];
    this.domainEvents.length = 0;
    return events;
  }

  changeStatus(status: BookingStatus, reason?: string) {
    if (!this.allowedTransitions()[this.props.status].includes(status)) {
      throw new BusinessRuleError(
        `No se puede cambiar una reserva de ${this.props.status} a ${status}`,
      );
    }
    this.props.status = status;
    if (status === 'rejected') {
      this.props.rejectionReason = reason?.trim() || 'Requisitos no cumplidos';
    }
  }

  canReceiveReminder() {
    return !['cancelled', 'rejected', 'completed'].includes(this.props.status);
  }

  get id() {
    return this.props.id;
  }

  get userId() {
    return this.props.userId;
  }

  get petId() {
    return this.props.petId;
  }

  get providerId() {
    return this.props.providerId;
  }

  get status() {
    return this.props.status;
  }

  get scheduledAt() {
    return this.props.scheduledAt;
  }

  toPrimitives() {
    return { ...this.props };
  }

  private allowedTransitions(): Record<BookingStatus, BookingStatus[]> {
    return {
      pending: ['confirmed', 'rejected', 'cancelled'],
      confirmed: ['in-progress', 'rejected', 'cancelled'],
      rejected: [],
      'in-progress': ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    };
  }
}
