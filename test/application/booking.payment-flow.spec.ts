import { BookingsApplicationService } from '../../src/modules/booking/application/bookings.application.service';
import { Booking } from '../../src/modules/booking/domain/entities/booking.entity';
import { Payment } from '../../src/modules/payment/domain/entities/payment.entity';
import { Pet } from '../../src/modules/pet/domain/entities/pet.entity';
import { Provider } from '../../src/modules/provider/domain/entities/provider.entity';
import { User } from '../../src/modules/user/domain/entities/user.entity';

describe('BookingsApplicationService payment flow', () => {
  it('creates an online booking pending and confirms it only after payment', async () => {
    const user = User.create({
      id: 'user_1',
      name: 'Ana',
      email: 'ana@example.com',
      role: 'pet-owner',
      passwordHash: 'hash',
      city: 'La Paz',
      createdAt: '2026-08-01T00:00:00.000Z',
    });
    const pet = Pet.create({
      id: 'pet_1',
      ownerId: user.id,
      name: 'Luna',
      species: 'dog',
    });
    const provider = Provider.create({
      id: 'provider_1',
      name: 'PetCare',
      type: 'employee',
      city: 'La Paz',
      address: 'Calle 1',
      services: ['walking'],
    });
    const payment = Payment.create({
      id: 'payment_1',
      userId: user.id,
      method: 'online',
      amount: 30000,
      status: 'pending',
      provider: 'mock',
      reference: 'PENDING-payment_1',
      createdAt: '2026-08-01T00:00:00.000Z',
    });
    const bookingRepository = {
      findAll: jest.fn().mockResolvedValue([]),
      findByIdempotencyKey: jest.fn().mockResolvedValue(null),
      findByPaymentId: jest.fn().mockResolvedValue(null),
      findById: jest.fn(),
      save: jest.fn(),
    };
    const paymentService = {
      createPending: jest.fn().mockReturnValue(payment),
      processInput: jest.fn().mockImplementation(() => {
        payment.markPaid('2026-08-01T00:01:00.000Z');
        return Promise.resolve(payment);
      }),
      publishPaymentConfirmed: jest.fn().mockResolvedValue(undefined),
      save: jest.fn(),
      charge: jest.fn(),
    };
    const eventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    };
    let pendingBooking: Booking | undefined;
    const transaction = {
      savePending: jest.fn((_payment: Payment, booking: Booking) => {
        pendingBooking = booking;
        return Promise.resolve();
      }),
      saveAfterPayment: jest.fn(() => Promise.resolve()),
    };
    const service = new BookingsApplicationService(
      { findById: jest.fn().mockResolvedValue(user) } as never,
      { findById: jest.fn().mockResolvedValue(pet) } as never,
      { findById: jest.fn().mockResolvedValue(provider) } as never,
      bookingRepository,
      { findById: jest.fn().mockResolvedValue(payment) } as never,
      { findAll: jest.fn().mockResolvedValue([]) } as never,
      { save: jest.fn(), findByUserBookingAndType: jest.fn() } as never,
      paymentService as never,
      transaction,
      eventBus as never,
    );

    const created = await service.create(
      'user_1',
      {
        petId: 'pet_1',
        providerId: 'provider_1',
        serviceType: 'walking',
        visitMode: 'at-location',
        scheduledAt: '2026-09-15T10:00:00.000Z',
        paymentMethod: 'online',
        idempotencyKey: 'checkout_1',
      },
      { id: 'user_1', role: 'pet-owner' },
    );

    expect(created.status).toBe('pending');
    expect(transaction.savePending).toHaveBeenCalled();
    if (!pendingBooking) {
      throw new Error('La transacción no recibió la reserva pendiente');
    }
    bookingRepository.findById.mockResolvedValue(pendingBooking);

    const paid = await service.pay(
      pendingBooking.id,
      {
        cardholderName: 'Ana Pérez',
        cardNumber: '4242424242424242',
        expiryMonth: 12,
        expiryYear: 2030,
        cvv: '123',
      },
      { id: 'user_1', role: 'pet-owner' },
    );

    expect(paid.booking.status).toBe('pending-confirmation');
    expect(paid.payment.status).toBe('paid');
    expect(transaction.saveAfterPayment).toHaveBeenCalled();
    expect(paymentService.publishPaymentConfirmed).toHaveBeenCalledWith(
      payment,
      pendingBooking,
    );

    const repeated = await service.pay(
      pendingBooking.id,
      {
        cardholderName: '',
        cardNumber: '',
        expiryMonth: 1,
        expiryYear: 2030,
        cvv: '',
      },
      { id: 'user_1', role: 'pet-owner' },
    );

    expect(repeated.payment.status).toBe('paid');
    expect(paymentService.publishPaymentConfirmed).toHaveBeenCalledTimes(2);

    await service.confirmFromPaymentEvent({
      eventId: 'payment-event_1',
      eventName: 'payment.confirmed',
      paymentId: payment.id,
      bookingId: pendingBooking.id,
      userId: user.id,
      providerId: provider.id,
      amount: payment.amount,
      currency: payment.toPrimitives().currency,
      occurredAt: '2026-08-01T00:02:00.000Z',
    });
    await service.confirmFromPaymentEvent({
      eventId: 'payment-event_1-retry',
      eventName: 'payment.confirmed',
      paymentId: payment.id,
      bookingId: pendingBooking.id,
      userId: user.id,
      providerId: provider.id,
      amount: payment.amount,
      currency: payment.toPrimitives().currency,
      occurredAt: '2026-08-01T00:02:00.000Z',
    });

    expect(pendingBooking.status).toBe('confirmed');
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
  });
});
