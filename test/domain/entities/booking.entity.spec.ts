import { Booking } from '../../../src/domain/entities/booking.entity';

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

  it('only allows valid lifecycle transitions', () => {
    const booking = createBooking();

    booking.changeStatus('in-progress');
    booking.changeStatus('completed');

    expect(booking.status).toBe('completed');
    expect(() => booking.changeStatus('cancelled')).toThrow(
      'No se puede cambiar',
    );
  });
});
