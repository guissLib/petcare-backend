import type { PaymentConfirmedEvent } from '../../domains/shared/petcare.types';

export const PETCARE_EVENT_BUS = Symbol('PETCARE_EVENT_BUS');

export type PetcareEvent = PaymentConfirmedEvent;
export type EventHandler<TEvent extends PetcareEvent> = (
  event: TEvent,
) => Promise<void>;

export interface PetcareEventBus {
  isAvailable(): boolean;
  publish(event: PetcareEvent): Promise<void>;
  subscribe(
    eventType: PetcareEvent['type'],
    handler: EventHandler<PaymentConfirmedEvent>,
  ): Promise<void>;
}
