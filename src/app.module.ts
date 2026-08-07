import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthApplicationService } from './application/auth.application.service';
import { SystemApplicationService } from './application/system.application.service';
import {
  PETCARE_MAP_GATEWAY,
  PETCARE_PAYMENT_GATEWAY,
} from './application/ports/integration.ports';
import { PASSWORD_HASHER } from './application/ports/password-hasher.port';
import { PERSISTENCE_HEALTH } from './application/ports/persistence-health.port';
import { BookingsApplicationService } from './application/bookings.application.service';
import { MapsApplicationService } from './application/maps.application.service';
import { NotificationsApplicationService } from './application/notifications.application.service';
import { PaymentsApplicationService } from './application/payments.application.service';
import { PetsApplicationService } from './application/pets.application.service';
import { PromotionsApplicationService } from './application/promotions.application.service';
import { ProvidersApplicationService } from './application/providers.application.service';
import { UsersApplicationService } from './application/users.application.service';
import { BOOKING_REPOSITORY } from './domain/repositories/booking.repository';
import { NOTIFICATION_REPOSITORY } from './domain/repositories/notification.repository';
import { PAYMENT_REPOSITORY } from './domain/repositories/payment.repository';
import { PET_REPOSITORY } from './domain/repositories/pet.repository';
import { PROMOTION_REPOSITORY } from './domain/repositories/promotion.repository';
import { PROVIDER_REPOSITORY } from './domain/repositories/provider.repository';
import { USER_REPOSITORY } from './domain/repositories/user.repository';
import { MockMapGateway } from './infrastructure/integrations/mock-map.gateway';
import { MockPaymentGateway } from './infrastructure/integrations/mock-payment.gateway';
import { BookingOrmEntity } from './infrastructure/persistence/entities/booking.orm-entity';
import { NotificationOrmEntity } from './infrastructure/persistence/entities/notification.orm-entity';
import { PaymentOrmEntity } from './infrastructure/persistence/entities/payment.orm-entity';
import { PetOrmEntity } from './infrastructure/persistence/entities/pet.orm-entity';
import { PetVaccinationOrmEntity } from './infrastructure/persistence/entities/pet-vaccination.orm-entity';
import { PromotionOrmEntity } from './infrastructure/persistence/entities/promotion.orm-entity';
import { PromotionServiceTypeOrmEntity } from './infrastructure/persistence/entities/promotion-service-type.orm-entity';
import { ProviderOrmEntity } from './infrastructure/persistence/entities/provider.orm-entity';
import { ProviderScheduleOrmEntity } from './infrastructure/persistence/entities/provider-schedule.orm-entity';
import { ProviderServiceOrmEntity } from './infrastructure/persistence/entities/provider-service.orm-entity';
import { UserOrmEntity } from './infrastructure/persistence/entities/user.orm-entity';
import { ScryptPasswordHasher } from './infrastructure/security/scrypt-password-hasher';
import { createTypeOrmOptions } from './infrastructure/persistence/typeorm.config';
import { TypeOrmPersistenceHealth } from './infrastructure/persistence/typeorm-persistence-health';
import { TypeOrmBookingRepository } from './infrastructure/persistence/repositories/typeorm-booking.repository';
import { TypeOrmNotificationRepository } from './infrastructure/persistence/repositories/typeorm-notification.repository';
import { TypeOrmPaymentRepository } from './infrastructure/persistence/repositories/typeorm-payment.repository';
import { TypeOrmPetRepository } from './infrastructure/persistence/repositories/typeorm-pet.repository';
import { TypeOrmPromotionRepository } from './infrastructure/persistence/repositories/typeorm-promotion.repository';
import { TypeOrmProviderRepository } from './infrastructure/persistence/repositories/typeorm-provider.repository';
import { TypeOrmUserRepository } from './infrastructure/persistence/repositories/typeorm-user.repository';
import { JwtAuthGuard } from './infrastructure/security/jwt-auth.guard';
import { AuthController } from './presentation/http/controllers/auth.controller';
import { BookingsController } from './presentation/http/controllers/bookings.controller';
import { MapsController } from './presentation/http/controllers/maps.controller';
import { NotificationsController } from './presentation/http/controllers/notifications.controller';
import { PaymentsController } from './presentation/http/controllers/payments.controller';
import { PetsController } from './presentation/http/controllers/pets.controller';
import { PromotionsController } from './presentation/http/controllers/promotions.controller';
import { ProvidersController } from './presentation/http/controllers/providers.controller';
import { SystemController } from './presentation/http/controllers/system.controller';
import { UsersController } from './presentation/http/controllers/users.controller';

@Module({
  imports: [
    JwtModule.register({
      secret: jwtSecret(),
      signOptions: {
        expiresIn: Number(process.env.AUTH_JWT_EXPIRES_IN_SECONDS ?? 3600),
      },
    }),
    TypeOrmModule.forRoot({
      ...createTypeOrmOptions(),
      retryAttempts: 1,
      retryDelay: 1000,
    }),
    TypeOrmModule.forFeature([
      BookingOrmEntity,
      NotificationOrmEntity,
      PaymentOrmEntity,
      PetOrmEntity,
      PetVaccinationOrmEntity,
      PromotionOrmEntity,
      PromotionServiceTypeOrmEntity,
      ProviderOrmEntity,
      ProviderScheduleOrmEntity,
      ProviderServiceOrmEntity,
      UserOrmEntity,
    ]),
  ],
  controllers: [
    SystemController,
    AuthController,
    UsersController,
    PetsController,
    ProvidersController,
    PromotionsController,
    BookingsController,
    PaymentsController,
    MapsController,
    NotificationsController,
  ],
  providers: [
    TypeOrmUserRepository,
    TypeOrmPetRepository,
    TypeOrmProviderRepository,
    TypeOrmPromotionRepository,
    TypeOrmPaymentRepository,
    TypeOrmBookingRepository,
    TypeOrmNotificationRepository,
    {
      provide: USER_REPOSITORY,
      useExisting: TypeOrmUserRepository,
    },
    {
      provide: PET_REPOSITORY,
      useExisting: TypeOrmPetRepository,
    },
    {
      provide: PROVIDER_REPOSITORY,
      useExisting: TypeOrmProviderRepository,
    },
    {
      provide: PROMOTION_REPOSITORY,
      useExisting: TypeOrmPromotionRepository,
    },
    {
      provide: PAYMENT_REPOSITORY,
      useExisting: TypeOrmPaymentRepository,
    },
    {
      provide: BOOKING_REPOSITORY,
      useExisting: TypeOrmBookingRepository,
    },
    {
      provide: NOTIFICATION_REPOSITORY,
      useExisting: TypeOrmNotificationRepository,
    },
    {
      provide: PASSWORD_HASHER,
      useClass: ScryptPasswordHasher,
    },
    {
      provide: PERSISTENCE_HEALTH,
      useClass: TypeOrmPersistenceHealth,
    },
    {
      provide: PETCARE_PAYMENT_GATEWAY,
      useClass: MockPaymentGateway,
    },
    {
      provide: PETCARE_MAP_GATEWAY,
      useClass: MockMapGateway,
    },
    UsersApplicationService,
    PetsApplicationService,
    ProvidersApplicationService,
    PromotionsApplicationService,
    PaymentsApplicationService,
    BookingsApplicationService,
    MapsApplicationService,
    NotificationsApplicationService,
    SystemApplicationService,
    AuthApplicationService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}

function jwtSecret() {
  const configured = process.env.AUTH_JWT_SECRET?.trim();
  if (configured) {
    if (configured.length < 32) {
      throw new Error('AUTH_JWT_SECRET must contain at least 32 characters');
    }
    return configured;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Missing required environment variable: AUTH_JWT_SECRET');
  }
  return 'petcare-local-development-secret-change-me';
}
