import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../../../domain/entities/booking.entity';
import type { BookingRepository } from '../../../domain/repositories/booking.repository';
import { BookingOrmEntity } from '../entities/booking.orm-entity';
import {
  optionalText,
  toDate,
  toIso,
} from '../../../../shared-kernel/infrastructure/persistence/orm-mapper.utils';

@Injectable()
export class TypeOrmBookingRepository implements BookingRepository {
  constructor(
    @InjectRepository(BookingOrmEntity)
    private readonly repository: Repository<BookingOrmEntity>,
  ) {}

  async save(booking: Booking) {
    const data = booking.toPrimitives();
    await this.repository.save({
      id: data.id,
      userId: data.userId,
      petId: data.petId,
      providerId: data.providerId,
      serviceType: data.serviceType,
      visitMode: data.visitMode,
      scheduledAt: toDate(data.scheduledAt),
      address: data.address ?? null,
      addressReference: data.addressReference ?? null,
      latitude: data.latitude?.toString() ?? null,
      longitude: data.longitude?.toString() ?? null,
      notes: data.notes ?? null,
      status: data.status,
      total: data.total,
      originalTotal: data.originalTotal,
      discountAmount: data.discountAmount,
      currency: data.currency,
      paymentMethod: data.paymentMethod,
      paymentId: data.paymentId,
      paymentExpiresAt: data.paymentExpiresAt
        ? toDate(data.paymentExpiresAt)
        : null,
      idempotencyKey: data.idempotencyKey ?? null,
      promotionId: data.promotionId ?? null,
      rejectionReason: data.rejectionReason ?? null,
      createdAt: toDate(data.createdAt),
    });
  }

  async findById(id: string) {
    const record = await this.repository.findOne({ where: { id } });
    return record ? toDomain(record) : null;
  }

  async findByPaymentId(paymentId: string) {
    const record = await this.repository.findOne({ where: { paymentId } });
    return record ? toDomain(record) : null;
  }

  async findByIdempotencyKey(idempotencyKey: string) {
    const record = await this.repository.findOne({
      where: { idempotencyKey },
    });
    return record ? toDomain(record) : null;
  }

  async findAll() {
    const records = await this.repository.find({
      order: { scheduledAt: 'ASC' },
    });
    return records.map(toDomain);
  }
}

function toDomain(record: BookingOrmEntity) {
  return Booking.rehydrate({
    id: record.id,
    userId: record.userId,
    petId: record.petId,
    providerId: record.providerId,
    serviceType: record.serviceType as
      | 'grooming'
      | 'walking'
      | 'boarding'
      | 'veterinary'
      | 'home-visit'
      | 'cleaning',
    visitMode: record.visitMode as
      'pickup-dropoff' | 'home-visit' | 'at-location',
    scheduledAt: toIso(record.scheduledAt),
    address: optionalText(record.address),
    latitude: record.latitude === null ? undefined : Number(record.latitude),
    longitude: record.longitude === null ? undefined : Number(record.longitude),
    addressReference: optionalText(record.addressReference),
    notes: optionalText(record.notes),
    status: record.status as
      | 'pending'
      | 'confirmed'
      | 'rejected'
      | 'in-progress'
      | 'completed'
      | 'cancelled',
    total: record.total,
    originalTotal: record.originalTotal,
    discountAmount: record.discountAmount,
    currency: record.currency,
    paymentMethod: record.paymentMethod as 'online' | 'at-location',
    paymentId: record.paymentId,
    paymentExpiresAt: record.paymentExpiresAt
      ? toIso(record.paymentExpiresAt)
      : undefined,
    idempotencyKey: optionalText(record.idempotencyKey),
    promotionId: optionalText(record.promotionId),
    rejectionReason: optionalText(record.rejectionReason),
    createdAt: toIso(record.createdAt),
  });
}
