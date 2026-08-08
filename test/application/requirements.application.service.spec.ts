import { BookingsApplicationService } from '../../src/modules/booking/application/bookings.application.service';
import { Booking } from '../../src/modules/booking/domain/entities/booking.entity';
import { Payment } from '../../src/modules/payment/domain/entities/payment.entity';
import { PetsApplicationService } from '../../src/modules/pet/application/pets.application.service';
import { Pet } from '../../src/modules/pet/domain/entities/pet.entity';
import { PromotionsApplicationService } from '../../src/modules/promotion/application/promotions.application.service';
import { Promotion } from '../../src/modules/promotion/domain/entities/promotion.entity';
import type { PetRepository } from '../../src/modules/pet/domain/repositories/pet.repository';
import type { PromotionRepository } from '../../src/modules/promotion/domain/repositories/promotion.repository';
import { Provider } from '../../src/modules/provider/domain/entities/provider.entity';
import type { ProviderRepository } from '../../src/modules/provider/domain/repositories/provider.repository';
import { User } from '../../src/modules/user/domain/entities/user.entity';

describe('PetCare requirement application services', () => {
  it('does not allow a provider to promote another provider service', async () => {
    const provider = Provider.create({
      id: 'provider_1',
      operatorUserId: 'user_provider',
      name: 'PetCare',
      type: 'employee',
      city: 'La Paz',
      address: 'Calle 1',
      services: ['grooming'],
    });
    const promotionRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn().mockResolvedValue([]),
    } as unknown as PromotionRepository;
    const providerRepository = {
      findById: jest.fn().mockResolvedValue(provider),
      findByOperatorUserId: jest.fn().mockResolvedValue(provider),
      findAll: jest.fn(),
      save: jest.fn(),
    } as unknown as ProviderRepository;
    const service = new PromotionsApplicationService(
      promotionRepository,
      providerRepository,
    );

    await expect(
      service.create(
        {
          name: 'Oferta',
          description: 'Oferta inválida',
          discountType: 'percent',
          discountValue: 10,
          scope: 'local',
          startsAt: '2026-01-01',
          endsAt: '2026-12-31',
          serviceTypes: ['boarding'],
        },
        {
          id: 'user_provider',
          role: 'provider',
          providerId: 'provider_1',
        },
      ),
    ).rejects.toThrow('servicios propios');
  });

  it('returns server-side fixed promotion quote and vaccination state', async () => {
    const user = User.create({
      id: 'user_1',
      name: 'Ana',
      email: 'ana@example.com',
      role: 'pet-owner',
      passwordHash: 'hash',
      city: 'La Paz',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    const pet = Pet.create({
      id: 'pet_1',
      ownerId: user.id,
      name: 'Luna',
      species: 'dog',
    });
    pet.addVaccination({
      id: 'vax_1',
      vaccine: 'Rabia',
      administeredAt: '2026-01-01T00:00:00.000Z',
      expiresAt: '2027-01-01T00:00:00.000Z',
      documentMimeType: 'application/pdf',
    });
    const provider = Provider.create({
      id: 'provider_1',
      name: 'PetCare',
      type: 'employee',
      city: 'La Paz',
      address: 'Calle 1',
      services: ['grooming'],
    });
    const promotion = Promotion.create({
      id: 'promo_1',
      name: 'Oferta fija',
      description: 'Descuento',
      discountType: 'fixed',
      discountValue: 5000,
      scope: 'local',
      city: 'La Paz',
      providerId: provider.id,
      serviceTypes: ['grooming'],
      startsAt: '2026-01-01',
      endsAt: '2027-01-01',
      active: true,
    });

    const service = new BookingsApplicationService(
      {
        findById: jest.fn().mockResolvedValue(user),
      } as never,
      {
        findById: jest.fn().mockResolvedValue(pet),
      } as never,
      {
        findById: jest.fn().mockResolvedValue(provider),
      } as never,
      {
        findAll: jest.fn().mockResolvedValue([]),
      } as never,
      {} as never,
      {
        findAll: jest.fn().mockResolvedValue([promotion]),
      } as never,
      {} as never,
      {} as never,
    );

    const quote = await service.quote('user_1', {
      petId: 'pet_1',
      providerId: 'provider_1',
      serviceType: 'grooming',
      visitMode: 'at-location',
      scheduledAt: '2026-09-15T10:00:00.000Z',
    });

    expect(quote).toMatchObject({
      originalTotal: 50000,
      discountAmount: 5000,
      total: 45000,
      vaccinationRequired: true,
      vaccinationValid: true,
    });
  });

  it('does not expose a pending booking to the provider before confirmation', async () => {
    const booking = Booking.rehydrate({
      id: 'booking_1',
      userId: 'user_1',
      petId: 'pet_1',
      providerId: 'provider_1',
      serviceType: 'home-visit',
      visitMode: 'home-visit',
      scheduledAt: '2026-09-15T10:00:00.000Z',
      address: 'Calle privada 1',
      latitude: -16.49,
      longitude: -68.12,
      addressReference: 'Portón negro',
      notes: undefined,
      status: 'pending',
      total: 60000,
      originalTotal: 60000,
      discountAmount: 0,
      currency: 'COP',
      paymentMethod: 'online',
      paymentId: 'payment_1',
      promotionId: undefined,
      rejectionReason: undefined,
      createdAt: '2026-08-01T00:00:00.000Z',
    });
    const payment = Payment.create({
      id: 'payment_1',
      method: 'online',
      amount: 60000,
      status: 'paid',
      provider: 'mock',
      reference: 'mock_1',
      createdAt: '2026-08-01T00:00:00.000Z',
    });
    const service = new BookingsApplicationService(
      {} as never,
      {} as never,
      {} as never,
      {
        findById: jest.fn().mockResolvedValue(booking),
      } as never,
      {
        findById: jest.fn().mockResolvedValue(payment),
      } as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.getById('booking_1', {
        id: 'provider_user',
        role: 'provider',
        providerId: 'provider_1',
      }),
    ).rejects.toThrow('No tiene acceso a esta reserva');
  });

  it('validates PDF MIME, signature and size before storing a vaccination', async () => {
    const pet = Pet.create({
      id: 'pet_1',
      ownerId: 'user_1',
      name: 'Luna',
      species: 'dog',
    });
    const repository = {
      findById: jest.fn().mockResolvedValue(pet),
      save: jest.fn(),
    } as unknown as PetRepository;
    const service = new PetsApplicationService(repository, {
      findById: jest.fn(),
    } as never);

    await expect(
      service.addVaccination(
        'pet_1',
        {
          vaccine: 'Rabia',
          administeredAt: '2026-01-01',
        },
        {
          buffer: new TextEncoder().encode('%PDF-invalid'),
          mimetype: 'image/png',
          originalname: 'carnet.png',
          size: 12,
        },
        { id: 'user_1', role: 'pet-owner' },
      ),
    ).rejects.toThrow(
      'Formato no válido. Por favor, suba el documento únicamente en formato PDF.',
    );
  });
});
