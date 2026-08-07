import { Inject, Injectable } from '@nestjs/common';
import { Promotion } from '../domain/entities/promotion.entity';
import { PROMOTION_REPOSITORY } from '../domain/repositories/promotion.repository';
import type { PromotionRepository } from '../domain/repositories/promotion.repository';
import {
  booleanValue,
  createId,
  numberValue,
  optionalText,
  required,
  stringArray,
  text,
  type Input,
} from './shared/application.utils';
import type { ServiceType } from '../domain/shared/types';

@Injectable()
export class PromotionsApplicationService {
  constructor(
    @Inject(PROMOTION_REPOSITORY)
    private readonly promotions: PromotionRepository,
  ) {}

  async list(query: Input) {
    const city = optionalText(query, 'city');
    const providerId = optionalText(query, 'providerId');
    const date = new Date();
    const promotions = await this.promotions.findAll();
    return promotions
      .filter((promotion) =>
        promotion.appliesTo(
          city,
          providerId,
          isServiceType(query.serviceType) ? query.serviceType : undefined,
          date,
        ),
      )
      .map((promotion) => promotion.toPrimitives());
  }

  async create(input: Input) {
    required(input, [
      'name',
      'description',
      'discountPercent',
      'scope',
      'startsAt',
      'endsAt',
    ]);
    const promotion = Promotion.create({
      id: createId('promo'),
      name: text(input, 'name'),
      description: text(input, 'description'),
      discountPercent: numberValue(input, 'discountPercent'),
      scope: input.scope as 'national' | 'local',
      city: optionalText(input, 'city'),
      providerId: optionalText(input, 'providerId'),
      serviceTypes: stringArray(input, 'serviceTypes') as ServiceType[],
      startsAt: text(input, 'startsAt'),
      endsAt: text(input, 'endsAt'),
      active: booleanValue(input, 'active', true),
    });
    await this.promotions.save(promotion);
    return promotion.toPrimitives();
  }
}

function isServiceType(value: unknown): value is ServiceType {
  return (
    typeof value === 'string' &&
    ['grooming', 'walking', 'boarding', 'veterinary', 'home-visit'].includes(
      value,
    )
  );
}
