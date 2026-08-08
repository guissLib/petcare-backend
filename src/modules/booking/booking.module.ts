import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationModule } from '../notification/notification.module';
import { PaymentModule } from '../payment/payment.module';
import { PetModule } from '../pet/pet.module';
import { PromotionModule } from '../promotion/promotion.module';
import { ProviderModule } from '../provider/provider.module';
import { SharedKernelModule } from '../shared-kernel/shared-kernel.module';
import { UserModule } from '../user/user.module';
import { BOOKING_REPOSITORY } from './domain/repositories/booking.repository';
import { BOOKING_PAYMENT_TRANSACTION } from './domain/repositories/booking-payment-transaction';
import { BookingsApplicationService } from './application/bookings.application.service';
import { PendingBookingExpirationScheduler } from './application/pending-booking-expiration.scheduler';
import { PaymentConfirmedConsumer } from './application/payment-confirmed.consumer';
import { BookingOrmEntity } from './infrastructure/persistence/entities/booking.orm-entity';
import { TypeOrmBookingRepository } from './infrastructure/persistence/repositories/typeorm-booking.repository';
import { TypeOrmBookingPaymentTransaction } from './infrastructure/persistence/repositories/typeorm-booking-payment-transaction';
import { BookingsController } from './presentation/http/controllers/bookings.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([BookingOrmEntity]),
    forwardRef(() => UserModule),
    forwardRef(() => PetModule),
    forwardRef(() => ProviderModule),
    PaymentModule,
    forwardRef(() => PromotionModule),
    forwardRef(() => NotificationModule),
    SharedKernelModule,
  ],
  controllers: [BookingsController],
  providers: [
    TypeOrmBookingRepository,
    TypeOrmBookingPaymentTransaction,
    {
      provide: BOOKING_REPOSITORY,
      useExisting: TypeOrmBookingRepository,
    },
    {
      provide: BOOKING_PAYMENT_TRANSACTION,
      useExisting: TypeOrmBookingPaymentTransaction,
    },
    BookingsApplicationService,
    PendingBookingExpirationScheduler,
    PaymentConfirmedConsumer,
  ],
  exports: [BOOKING_REPOSITORY, BookingsApplicationService],
})
export class BookingModule {}
