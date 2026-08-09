export type SagaMessageName =
  | 'payment.confirmed'
  | 'booking.confirm'
  | 'booking.confirmed'
  | 'booking.confirmation.failed'
  | 'booking.cancel'
  | 'booking.cancelled'
  | 'booking.cancellation.failed'
  | 'payment.refund'
  | 'payment.refunded'
  | 'payment.refund.failed'
  | 'notification.send-booking-confirmed'
  | 'notification.sent'
  | 'notification.failed';

export interface SagaMessage {
  eventId: string;
  eventName: SagaMessageName;
  occurredAt: string;
  sagaId?: string;
  bookingId?: string;
  paymentId?: string;
  userId?: string;
  providerId?: string;
  amount?: number;
  currency?: string;
  reason?: string;
  attempt?: number;
  [key: string]: unknown;
}

export type SagaMessageHandler = (message: SagaMessage) => Promise<void>;

export const SAGA_MESSAGE_BUS = Symbol('SAGA_MESSAGE_BUS');

export interface SagaMessageBus {
  publish(message: SagaMessage): Promise<void>;
  register(
    queue: string,
    routingKey: SagaMessageName,
    handler: SagaMessageHandler,
  ): void;
}
