import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../domain/entities/user.entity';
import type { UserRepository } from '../../../domain/repositories/user.repository';
import { UserOrmEntity } from '../entities/user.orm-entity';
import {
  optionalText,
  toDate,
  toIso,
} from '../../../../shared-kernel/infrastructure/persistence/orm-mapper.utils';
import { enqueueContextSnapshot } from '../../../../shared-kernel/infrastructure/persistence/context-snapshot-outbox';
import { toContextUserSnapshot } from '../../../../shared-kernel/infrastructure/messaging/context-snapshot.mapper';

@Injectable()
export class TypeOrmUserRepository implements UserRepository {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly repository: Repository<UserOrmEntity>,
  ) {}

  async save(user: User) {
    const data = user.toPrimitives();
    await this.repository.manager.transaction(async (manager) => {
      await manager.getRepository(UserOrmEntity).save({
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        passwordHash: data.passwordHash,
        city: data.city ?? null,
        phone: data.phone ?? null,
        createdAt: toDate(data.createdAt),
      });
      await enqueueContextSnapshot(manager, {
        eventType: 'context.user.upserted',
        aggregateType: 'user',
        aggregateId: data.id,
        data: toContextUserSnapshot(data),
      });
    });
  }

  async findById(id: string) {
    const record = await this.repository.findOne({ where: { id } });
    return record ? toDomain(record) : null;
  }

  async findByEmail(email: string) {
    const normalized = email.trim().toLowerCase();
    const record = await this.repository.findOne({
      where: { email: normalized },
    });
    return record ? toDomain(record) : null;
  }

  async findAll() {
    const records = await this.repository.find({
      order: { createdAt: 'ASC' },
    });
    return records.map(toDomain);
  }
}

function toDomain(record: UserOrmEntity) {
  return User.rehydrate({
    id: record.id,
    name: record.name,
    email: record.email,
    role: record.role as User['role'],
    passwordHash: record.passwordHash,
    city: optionalText(record.city),
    phone: optionalText(record.phone),
    createdAt: toIso(record.createdAt),
  });
}
