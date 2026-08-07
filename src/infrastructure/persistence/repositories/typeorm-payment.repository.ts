import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../../../domain/entities/payment.entity';
import type { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { PaymentOrmEntity } from '../entities/payment.orm-entity';
import { toDate, toIso } from './orm-mapper.utils';

@Injectable()
export class TypeOrmPaymentRepository implements PaymentRepository {
  constructor(
    @InjectRepository(PaymentOrmEntity)
    private readonly repository: Repository<PaymentOrmEntity>,
  ) {}

  async save(payment: Payment) {
    const data = payment.toPrimitives();
    await this.repository.save({
      id: data.id,
      method: data.method,
      status: data.status,
      amount: data.amount,
      currency: data.currency,
      provider: data.provider,
      reference: data.reference,
      createdAt: toDate(data.createdAt),
    });
  }

  async findById(id: string) {
    const record = await this.repository.findOne({ where: { id } });
    return record ? toDomain(record) : null;
  }
}

function toDomain(record: PaymentOrmEntity) {
  return Payment.rehydrate({
    id: record.id,
    method: record.method as 'online' | 'at-location',
    status: record.status as 'paid' | 'pending' | 'failed',
    amount: record.amount,
    currency: record.currency,
    provider: record.provider as 'mock',
    reference: record.reference,
    createdAt: toIso(record.createdAt),
  });
}
