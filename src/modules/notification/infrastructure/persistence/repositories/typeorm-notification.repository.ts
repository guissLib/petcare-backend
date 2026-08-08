import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../../domain/entities/notification.entity';
import type { NotificationRepository } from '../../../domain/repositories/notification.repository';
import { NotificationOrmEntity } from '../entities/notification.orm-entity';
import {
  optionalText,
  toDate,
  toIso,
} from '../../../../shared-kernel/infrastructure/persistence/orm-mapper.utils';

@Injectable()
export class TypeOrmNotificationRepository implements NotificationRepository {
  constructor(
    @InjectRepository(NotificationOrmEntity)
    private readonly repository: Repository<NotificationOrmEntity>,
  ) {}

  async save(notification: Notification) {
    const data = notification.toPrimitives();
    await this.repository.save({
      id: data.id,
      userId: data.userId,
      bookingId: data.bookingId ?? null,
      type: data.type,
      message: data.message,
      channel: data.channel,
      sentAt: toDate(data.sentAt),
      read: data.read,
    });
  }

  async findByUserId(userId: string) {
    const records = await this.repository.find({
      where: { userId },
      order: { sentAt: 'DESC' },
    });
    return records.map(toDomain);
  }

  async findByUserBookingAndType(
    userId: string,
    bookingId: string,
    type: 'confirmation' | 'reminder' | 'completion' | 'rejection',
  ) {
    const record = await this.repository.findOne({
      where: { userId, bookingId, type },
    });
    return record ? toDomain(record) : null;
  }
}

function toDomain(record: NotificationOrmEntity) {
  return Notification.rehydrate({
    id: record.id,
    userId: record.userId,
    bookingId: optionalText(record.bookingId),
    type: record.type as
      'confirmation' | 'reminder' | 'completion' | 'rejection',
    message: record.message,
    channel: record.channel as 'mock-push',
    sentAt: toIso(record.sentAt),
    read: record.read,
  });
}
