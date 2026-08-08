import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promotion } from '../../../domain/entities/promotion.entity';
import type { PromotionRepository } from '../../../domain/repositories/promotion.repository';
import { PromotionOrmEntity } from '../entities/promotion.orm-entity';
import { PromotionServiceTypeOrmEntity } from '../entities/promotion-service-type.orm-entity';
import {
  optionalText,
  toDate,
  toIso,
} from '../../../../shared-kernel/infrastructure/persistence/orm-mapper.utils';

@Injectable()
export class TypeOrmPromotionRepository implements PromotionRepository {
  constructor(
    @InjectRepository(PromotionOrmEntity)
    private readonly repository: Repository<PromotionOrmEntity>,
  ) {}

  async save(promotion: Promotion) {
    const data = promotion.toPrimitives();
    await this.repository.manager.transaction(async (manager) => {
      await manager.getRepository(PromotionOrmEntity).save({
        id: data.id,
        name: data.name,
        description: data.description,
        discountType: data.discountType,
        discountValue: data.discountValue.toString(),
        scope: data.scope,
        city: data.city ?? null,
        providerId: data.providerId ?? null,
        startsAt: toDate(data.startsAt),
        endsAt: toDate(data.endsAt),
        active: data.active,
      });

      const serviceTypes = manager.getRepository(PromotionServiceTypeOrmEntity);
      await serviceTypes.delete({ promotionId: data.id });
      await serviceTypes.save(
        (data.serviceTypes ?? []).map((serviceType) => ({
          promotionId: data.id,
          serviceType,
        })),
      );
    });
  }

  async findAll() {
    const records = await this.repository.find({
      relations: { serviceTypes: true },
      order: { startsAt: 'ASC' },
    });
    return records.map(toDomain);
  }

  async findById(id: string) {
    const record = await this.repository.findOne({
      where: { id },
      relations: { serviceTypes: true },
    });
    return record ? toDomain(record) : null;
  }
}

function toDomain(record: PromotionOrmEntity) {
  const serviceTypes = (record.serviceTypes ?? []).map(
    (serviceType) =>
      serviceType.serviceType as
        | 'grooming'
        | 'walking'
        | 'boarding'
        | 'veterinary'
        | 'home-visit'
        | 'cleaning',
  );

  return Promotion.rehydrate({
    id: record.id,
    name: record.name,
    description: record.description,
    discountType: record.discountType as 'percent' | 'fixed',
    discountValue: Number(record.discountValue),
    scope: record.scope as 'national' | 'local',
    city: optionalText(record.city),
    providerId: optionalText(record.providerId),
    serviceTypes: serviceTypes.length ? serviceTypes : undefined,
    startsAt: toIso(record.startsAt),
    endsAt: toIso(record.endsAt),
    active: record.active,
  });
}
