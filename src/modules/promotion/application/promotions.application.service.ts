import { Inject, Injectable } from '@nestjs/common';
import {
  AccessDeniedError,
  BusinessRuleError,
  EntityNotFoundError,
} from '../../shared-kernel/domain/shared/errors/domain-error';
import { Promotion } from '../domain/entities/promotion.entity';
import { PROMOTION_REPOSITORY } from '../domain/repositories/promotion.repository';
import type { PromotionRepository } from '../domain/repositories/promotion.repository';
import { PROVIDER_REPOSITORY } from '../../provider/domain/repositories/provider.repository';
import type { ProviderRepository } from '../../provider/domain/repositories/provider.repository';
import {
  booleanValue,
  createId,
  numberValue,
  optionalText,
  required,
  stringArray,
  text,
  type Input,
} from '../../shared-kernel/application/shared/application.utils';
import type {
  DiscountType,
  ServiceType,
} from '../../shared-kernel/domain/shared/types';

export interface PromotionActor {
  id: string;
  role: 'pet-owner' | 'provider' | 'administrator';
  city?: string;
  providerId?: string;
}

@Injectable()
export class PromotionsApplicationService {
  constructor(
    @Inject(PROMOTION_REPOSITORY)
    private readonly promotions: PromotionRepository,
    @Inject(PROVIDER_REPOSITORY)
    private readonly providers: ProviderRepository,
  ) {}

  async list(query: Input, actor?: PromotionActor) {
    const city =
      actor?.role === 'pet-owner' ? actor.city : optionalText(query, 'city');
    const providerId =
      actor?.role === 'provider'
        ? await this.providerIdFor(actor)
        : optionalText(query, 'providerId');
    const date = query.date ? new Date(text(query, 'date')) : new Date();
    const promotions = await this.promotions.findAll();
    return promotions
      .filter(
        (promotion) =>
          (actor?.role !== 'provider' || promotion.providerId === providerId) &&
          promotion.appliesTo(
            city,
            providerId,
            isServiceType(query.serviceType) ? query.serviceType : undefined,
            date,
          ),
      )
      .map((promotion) => promotion.toPrimitives());
  }

  async listOwn(actor: PromotionActor) {
    const providerId = await this.providerIdFor(actor);
    const promotions = await this.promotions.findAll();
    return promotions
      .filter((promotion) => promotion.providerId === providerId)
      .map((promotion) => promotion.toPrimitives());
  }

  async create(input: Input, actor?: PromotionActor) {
    required(input, ['name', 'description', 'scope', 'startsAt', 'endsAt']);
    const providerId = await this.providerIdForInput(input, actor);
    const serviceTypes = stringArray(input, 'serviceTypes') as ServiceType[];
    const scope = readScope(input.scope);
    const provider = providerId
      ? await this.providers.findById(providerId)
      : undefined;
    if (providerId && !provider) {
      throw new EntityNotFoundError('Proveedor no encontrado');
    }
    if (providerId) {
      await this.assertOwnServices(providerId, serviceTypes);
    }
    const discountType = readDiscountType(input.discountType);
    const legacyPercent = input.discountPercent;
    const discountValue =
      input.discountValue === undefined && legacyPercent !== undefined
        ? numberValue(input, 'discountPercent')
        : numberValue(input, 'discountValue');
    const promotion = Promotion.create({
      id: createId('promo'),
      name: text(input, 'name'),
      description: text(input, 'description'),
      discountType,
      discountValue,
      scope,
      city:
        scope === 'local'
          ? (provider?.city ?? optionalText(input, 'city'))
          : undefined,
      providerId,
      serviceTypes: serviceTypes.length ? serviceTypes : undefined,
      startsAt: text(input, 'startsAt'),
      endsAt: text(input, 'endsAt'),
      active:
        actor?.role === 'provider' ? true : booleanValue(input, 'active', true),
    });
    await this.promotions.save(promotion);
    return promotion.toPrimitives();
  }

  async setActive(
    promotionId: string,
    active: boolean,
    actor?: PromotionActor,
  ) {
    if (typeof active !== 'boolean') {
      throw new BusinessRuleError('active debe ser booleano');
    }
    const promotion = await this.getPromotion(promotionId);
    await this.assertCanManage(promotion, actor);
    promotion.setActive(active);
    await this.promotions.save(promotion);
    return promotion.toPrimitives();
  }

  async update(promotionId: string, input: Input, actor?: PromotionActor) {
    const current = await this.getPromotion(promotionId);
    await this.assertCanManage(current, actor);
    const currentData = current.toPrimitives();
    const serviceTypes = input.serviceTypes
      ? (stringArray(input, 'serviceTypes') as ServiceType[])
      : currentData.serviceTypes;
    if (current.providerId) {
      await this.assertOwnServices(current.providerId, serviceTypes ?? []);
    }
    const updated = Promotion.create({
      id: currentData.id,
      name: input.name === undefined ? currentData.name : text(input, 'name'),
      description:
        input.description === undefined
          ? currentData.description
          : text(input, 'description'),
      discountType:
        input.discountType === undefined
          ? currentData.discountType
          : readDiscountType(input.discountType),
      discountValue:
        input.discountValue === undefined
          ? currentData.discountValue
          : numberValue(input, 'discountValue'),
      scope:
        input.scope === undefined ? currentData.scope : readScope(input.scope),
      city:
        input.city === undefined
          ? currentData.city
          : optionalText(input, 'city'),
      providerId: currentData.providerId,
      serviceTypes: serviceTypes?.length ? serviceTypes : undefined,
      startsAt:
        input.startsAt === undefined
          ? currentData.startsAt
          : text(input, 'startsAt'),
      endsAt:
        input.endsAt === undefined ? currentData.endsAt : text(input, 'endsAt'),
      active:
        input.active === undefined
          ? currentData.active
          : booleanValue(input, 'active'),
    });
    await this.promotions.save(updated);
    return updated.toPrimitives();
  }

  private async providerIdForInput(
    input: Input,
    actor?: PromotionActor,
  ): Promise<string | undefined> {
    const requested = optionalText(input, 'providerId');
    if (!actor || actor.role === 'administrator') {
      return requested;
    }
    if (actor.role !== 'provider') {
      throw new AccessDeniedError(
        'Solo un proveedor puede crear promociones propias',
      );
    }
    const ownProviderId = await this.providerIdFor(actor);
    if (requested && requested !== ownProviderId) {
      throw new AccessDeniedError(
        'No puede crear promociones para otro proveedor',
      );
    }
    return ownProviderId;
  }

  private async providerIdFor(actor: PromotionActor) {
    if (actor.role !== 'provider') {
      throw new AccessDeniedError('El usuario no es un proveedor');
    }
    if (actor.providerId) {
      return actor.providerId;
    }
    const provider = await this.providers.findByOperatorUserId(actor.id);
    if (!provider) {
      throw new EntityNotFoundError('Proveedor no encontrado');
    }
    return provider.id;
  }

  private async assertOwnServices(
    providerId: string,
    serviceTypes: ServiceType[],
  ) {
    const provider = await this.providers.findById(providerId);
    if (!provider) {
      throw new EntityNotFoundError('Proveedor no encontrado');
    }
    if (serviceTypes.some((serviceType) => !provider.offers(serviceType))) {
      throw new BusinessRuleError(
        'La promoción solo puede asociar servicios propios del proveedor',
      );
    }
  }

  private async assertCanManage(promotion: Promotion, actor?: PromotionActor) {
    if (!actor || actor.role === 'administrator') {
      return;
    }
    if (actor.role !== 'provider') {
      throw new AccessDeniedError(
        'No tiene permisos para administrar promociones',
      );
    }
    const providerId = await this.providerIdFor(actor);
    if (!promotion.providerId || promotion.providerId !== providerId) {
      throw new AccessDeniedError(
        'No puede administrar promociones de otro proveedor',
      );
    }
  }

  private async getPromotion(id: string) {
    const promotion = await this.promotions.findById(id);
    if (!promotion) {
      throw new EntityNotFoundError('Promoción no encontrada');
    }
    return promotion;
  }
}

function readDiscountType(value: unknown): DiscountType {
  if (value === 'percent' || value === 'fixed') {
    return value;
  }
  if (value === undefined) {
    return 'percent';
  }
  throw new BusinessRuleError('discountType debe ser percent o fixed');
}

function readScope(value: unknown): 'national' | 'local' {
  if (value === 'national' || value === 'local') {
    return value;
  }
  throw new BusinessRuleError('scope debe ser national o local');
}

function isServiceType(value: unknown): value is ServiceType {
  return (
    typeof value === 'string' &&
    [
      'grooming',
      'walking',
      'boarding',
      'veterinary',
      'home-visit',
      'cleaning',
    ].includes(value)
  );
}
