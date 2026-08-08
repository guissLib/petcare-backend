import { PaymentsApplicationService } from '../../src/modules/payment/application/payments.application.service';
import { Payment } from '../../src/modules/payment/domain/entities/payment.entity';
import type { PaymentGateway } from '../../src/modules/shared-kernel/application/ports/integration.ports';
import type { PaymentRepository } from '../../src/modules/payment/domain/repositories/payment.repository';

describe('PaymentsApplicationService', () => {
  function createService(gateway: PaymentGateway) {
    const saveMock = jest.fn();
    const payments = {
      save: saveMock,
      findById: jest.fn(),
    } as unknown as PaymentRepository;
    return {
      service: new PaymentsApplicationService(payments, gateway),
      payments,
      saveMock,
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
});
