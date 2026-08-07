import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Provider } from '../../../domain/entities/provider.entity';
import type { ProviderRepository } from '../../../domain/repositories/provider.repository';
import { ProviderOrmEntity } from '../entities/provider.orm-entity';
import { ProviderScheduleOrmEntity } from '../entities/provider-schedule.orm-entity';
import { ProviderServiceOrmEntity } from '../entities/provider-service.orm-entity';
import { optionalText } from './orm-mapper.utils';

@Injectable()
export class TypeOrmProviderRepository implements ProviderRepository {
  constructor(
    @InjectRepository(ProviderOrmEntity)
    private readonly repository: Repository<ProviderOrmEntity>,
  ) {}

  async save(provider: Provider) {
    const data = provider.toPrimitives();
    await this.repository.manager.transaction(async (manager) => {
      await manager.getRepository(ProviderOrmEntity).save({
        id: data.id,
        operatorUserId: data.operatorUserId ?? null,
        name: data.name,
        type: data.type,
        city: data.city,
        address: data.address,
        latitude: data.latitude.toString(),
        longitude: data.longitude.toString(),
        capacity: data.capacity,
        acceptsHomeVisits: data.acceptsHomeVisits,
      });

      const services = manager.getRepository(ProviderServiceOrmEntity);
      await services.delete({ providerId: data.id });
      await services.save(
        data.services.map((serviceType) => ({
          providerId: data.id,
          serviceType,
        })),
      );

      const schedules = manager.getRepository(ProviderScheduleOrmEntity);
      await schedules.delete({ providerId: data.id });
      await schedules.save(
        data.schedule.map((schedule) => ({
          providerId: data.id,
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.start,
          endTime: schedule.end,
        })),
      );
    });
  }

  async findById(id: string) {
    const record = await this.repository.findOne({
      where: { id },
      relations: { services: true, schedules: true },
    });
    return record ? toDomain(record) : null;
  }

  async findAll() {
    const records = await this.repository.find({
      relations: { services: true, schedules: true },
      order: { name: 'ASC' },
    });
    return records.map(toDomain);
  }
}

function toDomain(record: ProviderOrmEntity) {
  return Provider.rehydrate({
    id: record.id,
    operatorUserId: optionalText(record.operatorUserId),
    name: record.name,
    type: record.type as 'employee' | 'contractor' | 'franchise',
    city: record.city,
    address: record.address,
    latitude: Number(record.latitude),
    longitude: Number(record.longitude),
    capacity: record.capacity,
    acceptsHomeVisits: record.acceptsHomeVisits,
    services: (record.services ?? []).map(
      (service) =>
        service.serviceType as
          'grooming' | 'walking' | 'boarding' | 'veterinary' | 'home-visit',
    ),
    schedule: (record.schedules ?? []).map((schedule) => ({
      dayOfWeek: schedule.dayOfWeek,
      start: schedule.startTime,
      end: schedule.endTime,
    })),
  });
}
