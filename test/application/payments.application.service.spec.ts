import { PaymentsApplicationService } from '../../src/modules/payment/application/payments.application.service';
import { Payment } from '../../src/modules/payment/domain/entities/payment.entity';
import type { PaymentGateway } from '../../src/modules/shared-kernel/application/ports/integration.ports';
import type { PaymentRepository } from '../../src/modules/payment/domain/repositories/payment.repository';
import type { PaymentEventPublisher } from '../../src/modules/shared-kernel/application/ports/payment-event-bus.port';

describe('PaymentsApplicationService', () => {
  function createService(
    gateway: PaymentGateway,
    eventPublisher?: PaymentEventPublisher,
  ) {
    const saveMock = jest.fn();
    const findByIdMock = jest.fn();
    const payments = {
      save: saveMock,
      findById: findByIdMock,
    } as unknown as PaymentRepository;
    return {
      service: new PaymentsApplicationService(
        payments,
        gateway,
        eventPublisher,
      ),
      payments,
      saveMock,
      findByIdMock,
    };
  }

  it('creates a pending intent without sending card data to persistence', () => {
    const { service } = createService({
      charge: jest.fn(),
    });

    const payment = service.createPending('user_1', 45000, 'online');

    expect(payment.toPrimitives()).toMatchObject({
      userId: 'user_1',
      status: 'pending',
      amount: 45000,
      attempts: 0,
    });
    expect(payment.toPrimitives()).not.toHaveProperty('cardNumber');
  });

  it('marks a mock card ending in 0002 as failed and persists the result', async () => {
    const { service, saveMock } = createService({
      charge: jest.fn().mockResolvedValue({
        status: 'failed',
        provider: 'mock',
        reference: 'MOCK-FAILED',
        failureReason: 'Tarjeta rechazada',
      }),
    });
    const payment = Payment.create({
      id: 'payment_1',
      userId: 'user_1',
      method: 'online',
      amount: 45000,
      status: 'pending',
      provider: 'mock',
      reference: 'PENDING-payment_1',
      createdAt: '2026-08-01T00:00:00.000Z',
    });

    const result = await service.pay(
      {
        cardholderName: 'Ana Pérez',
        cardNumber: '4242424242420002',
        expiryMonth: 12,
        expiryYear: 2030,
        cvv: '123',
      },
      payment,
    );

    expect(result.status).toBe('failed');
    expect(result.toPrimitives().failureReason).toBe('Tarjeta rechazada');
    expect(saveMock).toHaveBeenCalledWith(payment);
  });

  it('publishes confirmation only for the payment booking association', async () => {
    const publishMock = jest.fn();
    const { service, findByIdMock } = createService(
      { charge: jest.fn() },
      { publishPaymentConfirmed: publishMock },
    );
    const payment = Payment.create({
      id: 'payment_1',
      userId: 'user_1',
      bookingId: 'booking_1',
      method: 'online',
      amount: 45000,
      status: 'paid',
      provider: 'mock',
      reference: 'MOCK-PAID',
      createdAt: '2026-08-01T00:00:00.000Z',
      paidAt: '2026-08-01T00:01:00.000Z',
    });
    findByIdMock.mockResolvedValue(payment);

    await service.publishBookingConfirmation({
      bookingId: 'booking_1',
      userId: 'user_1',
      providerId: 'provider_1',
      paymentId: 'payment_1',
      amount: 45000,
    });

    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: 'booking_1',
        paymentId: 'payment_1',
        amount: 45000,
      }),
    );
    await expect(
      service.publishBookingConfirmation({
        bookingId: 'booking_other',
        userId: 'user_1',
        providerId: 'provider_1',
        paymentId: 'payment_1',
        amount: 45000,
      }),
    ).rejects.toThrow('pago no está listo');
  });
});
