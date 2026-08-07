import type { DomainEvent } from './domain-event';

export class PaymentCreatedDomainEvent implements DomainEvent {
  readonly eventName = 'payment.created';
  readonly occurredOn: string;

  constructor(
    readonly aggregateId: string,
    readonly amount: number,
    readonly method: string,
  ) {
    this.occurredOn = new Date().toISOString();
  }
}
