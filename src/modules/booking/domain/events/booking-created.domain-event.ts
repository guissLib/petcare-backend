import type { DomainEvent } from '../../../shared-kernel/domain/events/domain-event';

export class BookingCreatedDomainEvent implements DomainEvent {
  readonly eventName = 'booking.created';
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
