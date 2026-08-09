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

export const PAYMENT_EVENT_PUBLISHER = Symbol('PAYMENT_EVENT_PUBLISHER');

export interface PaymentEventPublisher {
  publishPaymentConfirmed(message: PaymentConfirmedMessage): Promise<void>;
}
