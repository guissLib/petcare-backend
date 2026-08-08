import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingModule } from '../booking/booking.module';
import { PROVIDER_REPOSITORY } from './domain/repositories/provider.repository';
import { ProvidersApplicationService } from './application/providers.application.service';
import { ProviderOrmEntity } from './infrastructure/persistence/entities/provider.orm-entity';
import { ProviderScheduleOrmEntity } from './infrastructure/persistence/entities/provider-schedule.orm-entity';
import { ProviderServiceOrmEntity } from './infrastructure/persistence/entities/provider-service.orm-entity';
import { TypeOrmProviderRepository } from './infrastructure/persistence/repositories/typeorm-provider.repository';
import { ProvidersController } from './presentation/http/controllers/providers.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProviderOrmEntity,
      ProviderServiceOrmEntity,
      ProviderScheduleOrmEntity,
    ]),
    forwardRef(() => BookingModule),
  ],
  controllers: [ProvidersController],
  providers: [
    TypeOrmProviderRepository,
    {
      provide: PROVIDER_REPOSITORY,
      useExisting: TypeOrmProviderRepository,
    },
    ProvidersApplicationService,
  ],
  exports: [PROVIDER_REPOSITORY, ProvidersApplicationService],
})
export class ProviderModule {}
