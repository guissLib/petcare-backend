import type { DomainEvent } from '../../domain/events/domain-event';

export const EVENT_BUS = Symbol('EVENT_BUS');

export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe(
    eventName: string,
    handler: (event: DomainEvent) => Promise<void>,
  ): void;
}
