import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProviderModule } from '../provider/provider.module';
import { PROMOTION_REPOSITORY } from './domain/repositories/promotion.repository';
import { PromotionsApplicationService } from './application/promotions.application.service';
import { PromotionOrmEntity } from './infrastructure/persistence/entities/promotion.orm-entity';
import { PromotionServiceTypeOrmEntity } from './infrastructure/persistence/entities/promotion-service-type.orm-entity';
import { TypeOrmPromotionRepository } from './infrastructure/persistence/repositories/typeorm-promotion.repository';
import { PromotionsController } from './presentation/http/controllers/promotions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PromotionOrmEntity,
      PromotionServiceTypeOrmEntity,
    ]),
    forwardRef(() => ProviderModule),
  ],
  controllers: [PromotionsController],
  providers: [
    TypeOrmPromotionRepository,
    {
      provide: PROMOTION_REPOSITORY,
      useExisting: TypeOrmPromotionRepository,
    },
    PromotionsApplicationService,
  ],
  exports: [PROMOTION_REPOSITORY, PromotionsApplicationService],
})
export class PromotionModule {}
