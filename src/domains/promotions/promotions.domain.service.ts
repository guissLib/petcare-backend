import { BadRequestException, Injectable } from '@nestjs/common';
import { PetcareStoreService } from '../../application/petcare-store.service';
import {
  createId,
  Input,
  optionalString,
  read,
  stringValue,
  required,
} from '../shared/input';
import { Promotion } from '../shared/petcare.types';

@Injectable()
export class PromotionsDomainService {
  constructor(private readonly store: PetcareStoreService) {}

  list(query: Input) {
    const date = new Date();
    const city = optionalString(query, 'city');
    const providerId = optionalString(query, 'providerId');
    return this.store.data.promotions.filter(
      (promotion) =>
        promotion.active &&
        new Date(promotion.startsAt) <= date &&
        new Date(promotion.endsAt) >= date &&
        (!city ||
          promotion.scope === 'national' ||
          promotion.city?.toLowerCase() === city.toLowerCase()) &&
        (!providerId ||
          promotion.scope === 'national' ||
          promotion.providerId === providerId),
    );
  }

  create(input: Input) {
    required(input, [
      'name',
      'description',
      'discountPercent',
      'scope',
      'startsAt',
      'endsAt',
    ]);
    const scope = stringValue(input, 'scope') as Promotion['scope'];
    const city = optionalString(input, 'city');
    const providerId = optionalString(input, 'providerId');
    if (scope === 'local' && !city && !providerId) {
      throw new BadRequestException(
        'Una promoción local requiere city o providerId',
      );
    }

    const promotion: Promotion = {
      id: createId('promo'),
      name: stringValue(input, 'name'),
      description: stringValue(input, 'description'),
      discountPercent: Number(input.discountPercent),
      scope,
      city,
      providerId,
      serviceTypes: read<Promotion['serviceTypes']>(input, 'serviceTypes'),
      startsAt: stringValue(input, 'startsAt'),
      endsAt: stringValue(input, 'endsAt'),
      active: input.active === undefined ? true : Boolean(input.active),
    };
    this.store.data.promotions.push(promotion);
    void this.store.persist();
    return promotion;
  }
}
