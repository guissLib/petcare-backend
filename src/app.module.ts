import { Module } from '@nestjs/common';
import { PetcareApplicationService } from './application/petcare.application.service';
import { PetcareStoreService } from './application/petcare-store.service';
import { PETCARE_PERSISTENCE } from './application/ports/petcare-persistence.port';
import { BookingsDomainService } from './domains/bookings/bookings.domain.service';
import { MapsDomainService } from './domains/maps/maps.domain.service';
import { NotificationsDomainService } from './domains/notifications/notifications.domain.service';
import { PaymentsDomainService } from './domains/payments/payments.domain.service';
import { PetsDomainService } from './domains/pets/pets.domain.service';
import { ProvidersDomainService } from './domains/providers/providers.domain.service';
import { PromotionsDomainService } from './domains/promotions/promotions.domain.service';
import { UsersDomainService } from './domains/users/users.domain.service';
import { PetcareController } from './interfaces/http/petcare.controller';
import { MysqlPersistenceService } from './infrastructure/persistence/mysql-persistence.service';

@Module({
  imports: [],
  controllers: [PetcareController],
  providers: [
    { provide: PETCARE_PERSISTENCE, useClass: MysqlPersistenceService },
    PetcareStoreService,
    UsersDomainService,
    PetsDomainService,
    ProvidersDomainService,
    PromotionsDomainService,
    NotificationsDomainService,
    PaymentsDomainService,
    MapsDomainService,
    BookingsDomainService,
    PetcareApplicationService,
  ],
})
export class AppModule {}
