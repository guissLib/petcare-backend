import { Payment } from '../../../src/modules/payment/domain/entities/payment.entity';

function createPendingPayment() {
  return Payment.create({
    id: 'payment_1',
    userId: 'user_1',
    method: 'online',
    amount: 45000,
    status: 'pending',
    provider: 'mock',
    reference: 'PENDING-payment_1',
    createdAt: '2026-08-01T00:00:00.000Z',
  });
}

describe('Payment', () => {
  it('transitions from pending to paid and records the payment time', () => {
    const payment = createPendingPayment();

    payment.startAttempt();
    payment.markPaid('2026-08-01T00:01:00.000Z');

    expect(payment.toPrimitives()).toMatchObject({
      status: 'paid',
      paidAt: '2026-08-01T00:01:00.000Z',
      attempts: 1,
    });
  });

  it('supports a failed attempt followed by a retry', () => {
    const payment = createPendingPayment();

    payment.startAttempt();
    payment.markFailed('Tarjeta rechazada');
    payment.startAttempt();
    payment.markPaid('2026-08-01T00:02:00.000Z');

    expect(payment.status).toBe('paid');
    expect(payment.toPrimitives().attempts).toBe(2);
    expect(payment.toPrimitives().failureReason).toBeUndefined();
  });

  it('keeps the payment owner for authorization checks', () => {
    expect(createPendingPayment().userId).toBe('user_1');
  });
});
