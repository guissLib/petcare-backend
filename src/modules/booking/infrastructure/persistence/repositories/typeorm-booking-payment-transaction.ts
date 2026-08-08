import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { Booking } from '../../../domain/entities/booking.entity';
import type { Payment } from '../../../../payment/domain/entities/payment.entity';
import { BookingOrmEntity } from '../entities/booking.orm-entity';
import { PaymentOrmEntity } from '../../../../payment/infrastructure/persistence/entities/payment.orm-entity';
import { toDate } from '../../../../shared-kernel/infrastructure/persistence/orm-mapper.utils';

@Injectable()
export class TypeOrmBookingPaymentTransaction {
  constructor(private readonly dataSource: DataSource) {}

  async savePending(payment: Payment, booking: Booking) {
    await this.saveBoth(payment, booking);
  }

  async saveConfirmed(payment: Payment, booking: Booking) {
    await this.saveBoth(payment, booking);
  }

  private async saveBoth(payment: Payment, booking: Booking) {
    const paymentData = payment.toPrimitives();
    const bookingData = booking.toPrimitives();
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(PaymentOrmEntity).save({
        id: paymentData.id,
        userId: paymentData.userId ?? null,
        method: paymentData.method,
        status: paymentData.status,
        amount: paymentData.amount,
        currency: paymentData.currency,
        provider: paymentData.provider,
        reference: paymentData.reference,
        createdAt: toDate(paymentData.createdAt),
        paidAt: paymentData.paidAt ? toDate(paymentData.paidAt) : null,
        failureReason: paymentData.failureReason ?? null,
        attempts: paymentData.attempts,
      });
      await manager
        .getRepository(BookingOrmEntity)
        .save(bookingValues(bookingData));
    });
  }
}

function bookingValues(data: ReturnType<Booking['toPrimitives']>) {
  return {
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
  };
}
