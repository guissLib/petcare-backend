import type { Booking } from '../entities/booking.entity';
import type { Payment } from '../../../payment/domain/entities/payment.entity';

export const BOOKING_PAYMENT_TRANSACTION = Symbol(
  'BOOKING_PAYMENT_TRANSACTION',
);

export interface BookingPaymentTransaction {
  savePending(payment: Payment, booking: Booking): Promise<void>;
  saveAfterPayment(payment: Payment, booking: Booking): Promise<void>;
}
