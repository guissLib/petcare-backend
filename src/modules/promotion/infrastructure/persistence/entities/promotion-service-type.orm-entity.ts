import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { PromotionOrmEntity } from './promotion.orm-entity';

@Entity({ name: 'promotion_service_types' })
export class PromotionServiceTypeOrmEntity {
  @PrimaryColumn({ name: 'promotion_id', type: 'varchar', length: 64 })
  promotionId!: string;

  @PrimaryColumn({ name: 'service_type', type: 'varchar', length: 32 })
  serviceType!: string;

  @ManyToOne(() => PromotionOrmEntity, (promotion) => promotion.serviceTypes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'promotion_id', referencedColumnName: 'id' })
  promotion!: PromotionOrmEntity;
}
