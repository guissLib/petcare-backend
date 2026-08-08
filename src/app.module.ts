import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingModule } from './modules/booking/booking.module';
import { MapModule } from './modules/map/map.module';
import { NotificationModule } from './modules/notification/notification.module';
import { PaymentModule } from './modules/payment/payment.module';
import { PetModule } from './modules/pet/pet.module';
import { PromotionModule } from './modules/promotion/promotion.module';
import { ProviderModule } from './modules/provider/provider.module';
import { SharedKernelModule } from './modules/shared-kernel/shared-kernel.module';
import { createTypeOrmOptions } from './modules/shared-kernel/infrastructure/persistence/typeorm.config';
import { SystemModule } from './modules/system/system.module';
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...createTypeOrmOptions(),
      retryAttempts: 1,
      retryDelay: 1000,
    }),
    SharedKernelModule,
    UserModule,
    PetModule,
    ProviderModule,
    PromotionModule,
    PaymentModule,
    BookingModule,
    NotificationModule,
    MapModule,
    SystemModule,
  ],
})
export class AppModule {}
