import { Inject, Injectable } from '@nestjs/common';
import {
  BusinessRuleError,
  EntityNotFoundError,
} from '../../shared-kernel/domain/shared/errors/domain-error';
import type { Input } from '../../shared-kernel/application/shared/application.utils';
import { PET_REPOSITORY } from '../../pet/domain/repositories/pet.repository';
import type { PetRepository } from '../../pet/domain/repositories/pet.repository';
import { PROMOTION_REPOSITORY } from '../../promotion/domain/repositories/promotion.repository';
import type { PromotionRepository } from '../../promotion/domain/repositories/promotion.repository';
import { PROVIDER_REPOSITORY } from '../../provider/domain/repositories/provider.repository';
import type { ProviderRepository } from '../../provider/domain/repositories/provider.repository';
import { USER_REPOSITORY } from '../../user/domain/repositories/user.repository';
import type { UserRepository } from '../../user/domain/repositories/user.repository';

@Injectable()
export class BookingContextApplicationService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
    @Inject(PET_REPOSITORY)
    private readonly pets: PetRepository,
    @Inject(PROVIDER_REPOSITORY)
    private readonly providers: ProviderRepository,
    @Inject(PROMOTION_REPOSITORY)
    private readonly promotions: PromotionRepository,
  ) {}

  async get(input: Input) {
    const userId = requiredText(input.userId, 'userId');
    const petId = requiredText(input.petId, 'petId');
    const providerId = requiredText(input.providerId, 'providerId');

    const [user, pet, provider, promotions] = await Promise.all([
      this.users.findById(userId),
      this.pets.findById(petId),
      this.providers.findById(providerId),
      this.promotions.findAll(),
    ]);
    if (!user) {
      throw new EntityNotFoundError('Usuario no encontrado');
    }
    if (!pet) {
      throw new EntityNotFoundError('Mascota no encontrada');
    }
    if (!provider) {
      throw new EntityNotFoundError('Proveedor no encontrado');
    }
    if (pet.toPrimitives().ownerId !== userId) {
      throw new EntityNotFoundError('Mascota no encontrada');
    }
    return {
      user: {
        id: user.id,
        city: user.toPrimitives().city,
      },
      pet: {
        id: pet.id,
        ownerId: pet.toPrimitives().ownerId,
        vaccinationRecords: pet.toPrimitives().vaccinationRecords,
      },
      provider: provider.toPrimitives(),
      promotions: promotions.map((promotion) => promotion.toPrimitives()),
    };
  }
}

function requiredText(value: unknown, field: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new BusinessRuleError(`${field} es requerido`);
  }
  return value.trim();
}
