import { Promotion } from '../../../src/modules/promotion/domain/entities/promotion.entity';

const basePromotion = {
  id: 'promo_1',
  name: 'Oferta',
  description: 'Oferta de prueba',
  scope: 'local' as const,
  city: 'La Paz',
  providerId: 'provider_1',
  serviceTypes: ['grooming' as const],
  startsAt: '2026-01-01T00:00:00.000Z',
  endsAt: '2026-12-31T23:59:59.000Z',
  active: true,
};

describe('Promotion', () => {
  it('calculates a percentage discount', () => {
    const promotion = Promotion.create({
      ...basePromotion,
      discountType: 'percent',
      discountValue: 10,
    });

    expect(promotion.calculateDiscount(50000)).toEqual({
      discountAmount: 5000,
      finalAmount: 45000,
    });
  });

  it('calculates a fixed discount without exceeding the base price', () => {
    const promotion = Promotion.create({
      ...basePromotion,
      discountType: 'fixed',
      discountValue: 12000,
    });

    expect(promotion.calculateDiscount(50000)).toEqual({
      discountAmount: 12000,
      finalAmount: 38000,
    });
  });

  it('only applies to the associated provider and service', () => {
    const promotion = Promotion.create({
      ...basePromotion,
      discountType: 'fixed',
      discountValue: 5000,
    });

    expect(
      promotion.appliesTo(
        'La Paz',
        'provider_1',
        'grooming',
        new Date('2026-06-01'),
      ),
    ).toBe(true);
    expect(
      promotion.appliesTo(
        'La Paz',
        'provider_2',
        'grooming',
        new Date('2026-06-01'),
      ),
    ).toBe(false);
    expect(
      promotion.appliesTo(
        'La Paz',
        'provider_1',
        'boarding',
        new Date('2026-06-01'),
      ),
    ).toBe(false);
  });

  it('applies national promotions to any city but local promotions only to their city', () => {
    const national = Promotion.create({
      ...basePromotion,
      scope: 'national',
      city: undefined,
      discountType: 'fixed',
      discountValue: 5000,
    });
    const local = Promotion.create({
      ...basePromotion,
      discountType: 'fixed',
      discountValue: 5000,
    });

    expect(
      national.appliesTo(
        'Santa Cruz',
        'provider_1',
        'grooming',
        new Date('2026-06-01'),
      ),
    ).toBe(true);
    expect(
      national.appliesTo(
        'Santa Cruz',
        'provider_2',
        'grooming',
        new Date('2026-06-01'),
      ),
    ).toBe(false);
    expect(
      local.appliesTo(
        'Santa Cruz',
        'provider_1',
        'grooming',
        new Date('2026-06-01'),
      ),
    ).toBe(false);
    expect(
      local.appliesTo(
        'La Paz',
        'provider_1',
        'grooming',
        new Date('2026-06-01'),
      ),
    ).toBe(true);
  });
});
