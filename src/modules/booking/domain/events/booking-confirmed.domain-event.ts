import type { DomainEvent } from '../../../shared-kernel/domain/events/domain-event';

export class BookingConfirmedDomainEvent implements DomainEvent {
  readonly eventName = 'booking.confirmed';
  readonly occurredOn: string;

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
    readonly providerId: string,
    readonly paymentId: string,
  ) {
    this.occurredOn = new Date().toISOString();
  }
}
