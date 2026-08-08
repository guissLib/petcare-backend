import { Injectable } from '@nestjs/common';
import type { EventBus } from '../../application/ports/event-bus.port';
import type { DomainEvent } from '../../domain/events/domain-event';

@Injectable()
export class LocalEventBus implements EventBus {
  private readonly handlers = new Map<
    string,
    Array<(event: DomainEvent) => Promise<void>>
  >();

  async publish(event: DomainEvent) {
    const handlers = this.handlers.get(event.eventName) ?? [];
    for (const handler of handlers) {
      await handler(event);
    }
  }

  subscribe(eventName: string, handler: (event: DomainEvent) => Promise<void>) {
    const handlers = this.handlers.get(eventName) ?? [];
    handlers.push(handler);
    this.handlers.set(eventName, handlers);
  }
}
