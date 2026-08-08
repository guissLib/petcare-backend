export interface PaymentConfirmedMessage {
  eventId: string;
  eventName: 'payment.confirmed';
  paymentId: string;
  bookingId: string;
  userId: string;
  providerId: string;
  amount: number;
  currency: string;
  occurredAt: string;
}

export type PaymentConfirmedHandler = (
  message: PaymentConfirmedMessage,
) => Promise<void>;

export const PAYMENT_EVENT_PUBLISHER = Symbol('PAYMENT_EVENT_PUBLISHER');
export const PAYMENT_EVENT_CONSUMER = Symbol('PAYMENT_EVENT_CONSUMER');

export interface PaymentEventPublisher {
  publishPaymentConfirmed(message: PaymentConfirmedMessage): Promise<void>;
}

export interface PaymentEventConsumer {
  registerPaymentConfirmedHandler(handler: PaymentConfirmedHandler): void;
}
