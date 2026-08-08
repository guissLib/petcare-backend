import { Booking } from '../../../src/modules/booking/domain/entities/booking.entity';

describe('Booking', () => {
  const createBooking = () =>
    Booking.create({
      id: 'booking_1',
      userId: 'user_1',
      petId: 'pet_1',
      providerId: 'provider_1',
      serviceType: 'grooming',
      visitMode: 'at-location',
      scheduledAt: '2026-09-15T10:00:00.000Z',
      total: 45000,
      paymentMethod: 'online',
      paymentId: 'payment_1',
      createdAt: '2026-08-01T00:00:00.000Z',
    });

  it('starts confirmed after the application validates payment and availability', () => {
    const booking = createBooking();

    expect(booking.status).toBe('confirmed');
  });

  it('starts pending for online checkout and confirms only after payment', () => {
    const booking = Booking.createPending(
      {
        id: 'booking_pending',
        userId: 'user_1',
        petId: 'pet_1',
        providerId: 'provider_1',
        serviceType: 'grooming',
        visitMode: 'at-location',
        scheduledAt: '2026-09-15T10:00:00.000Z',
        total: 45000,
        paymentMethod: 'online',
        paymentId: 'payment_pending',
        createdAt: '2026-08-01T00:00:00.000Z',
      },
      '2026-09-15T09:00:00.000Z',
    );

    expect(booking.status).toBe('pending');
    booking.markPendingConfirmation('paid');
    booking.confirmAfterPayment('paid');

    expect(booking.status).toBe('confirmed');
    expect(booking.pullDomainEvents()).toEqual([
      expect.objectContaining({
        eventName: 'booking.confirmed',
        aggregateId: 'booking_pending',
      }),
    ]);
  });

  it('cancels a pending booking when its payment window expires', () => {
    const booking = Booking.createPending(
      {
        id: 'booking_expired',
        userId: 'user_1',
        petId: 'pet_1',
        providerId: 'provider_1',
        serviceType: 'grooming',
        visitMode: 'at-location',
        scheduledAt: '2026-09-15T10:00:00.000Z',
        total: 45000,
        paymentMethod: 'online',
        paymentId: 'payment_expired',
        createdAt: '2026-08-01T00:00:00.000Z',
      },
      '2026-09-15T09:00:00.000Z',
    );

    expect(booking.isPaymentExpired(new Date('2026-09-15T10:00:00.000Z'))).toBe(
      true,
    );
    booking.cancelExpiredPayment();

    expect(booking.status).toBe('cancelled');
    expect(booking.rejectionReason).toContain('expiró');
  });

  it('only allows valid lifecycle transitions', () => {
    const booking = createBooking();

    booking.changeStatus('in-progress');
    booking.changeStatus('completed');

    expect(booking.status).toBe('completed');
    expect(() => booking.changeStatus('cancelled')).toThrow(
      'No se puede cambiar',
    );
  });

  it('requires a valid Bolivian location for home visits', () => {
    expect(() =>
      Booking.create({
        id: 'booking_home',
        userId: 'user_1',
        petId: 'pet_1',
        providerId: 'provider_1',
        serviceType: 'home-visit',
        visitMode: 'home-visit',
        scheduledAt: '2026-09-15T10:00:00.000Z',
        address: 'Calle 1',
        addressReference: 'Portón negro',
        latitude: 4.6,
        longitude: -74.0,
        total: 60000,
        paymentMethod: 'online',
        paymentId: 'payment_home',
        createdAt: '2026-08-01T00:00:00.000Z',
      }),
    ).toThrow('dentro de Bolivia');

    const booking = Booking.create({
      id: 'booking_home_bo',
      userId: 'user_1',
      petId: 'pet_1',
      providerId: 'provider_1',
      serviceType: 'home-visit',
      visitMode: 'home-visit',
      scheduledAt: '2026-09-15T10:00:00.000Z',
      address: 'Calle 1',
      addressReference: 'Portón negro',
      latitude: -16.49,
      longitude: -68.12,
      total: 60000,
      paymentMethod: 'online',
      paymentId: 'payment_home_bo',
      createdAt: '2026-08-01T00:00:00.000Z',
    });

    expect(booking.toPrimitives()).toMatchObject({
      latitude: -16.49,
      longitude: -68.12,
      addressReference: 'Portón negro',
    });
  });
});
