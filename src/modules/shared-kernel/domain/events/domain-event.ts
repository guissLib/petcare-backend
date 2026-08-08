export interface DomainEvent {
  readonly eventName: string;
  readonly aggregateId: string;
  readonly occurredOn: string;
}
