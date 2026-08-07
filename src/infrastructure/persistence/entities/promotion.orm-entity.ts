import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { BookingOrmEntity } from './booking.orm-entity';
import { PromotionServiceTypeOrmEntity } from './promotion-service-type.orm-entity';
import { ProviderOrmEntity } from './provider.orm-entity';

@Entity({ name: 'promotions' })
@Index('IDX_promotions_active_dates', ['active', 'startsAt', 'endsAt'])
export class PromotionOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Column({ type: 'varchar', length: 160 })
  name!: string;

  @Column({ type: 'varchar', length: 500 })
  description!: string;

  @Column({ name: 'discount_percent', type: 'decimal', precision: 5, scale: 2 })
  discountPercent!: string;

  @Column({ type: 'varchar', length: 16 })
  scope!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  city!: string | null;

  @Column({ name: 'provider_id', type: 'varchar', length: 64, nullable: true })
  providerId!: string | null;

  @ManyToOne(() => ProviderOrmEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'provider_id', referencedColumnName: 'id' })
  provider!: ProviderOrmEntity | null;

  @Column({ name: 'starts_at', type: 'datetime', precision: 3 })
  startsAt!: Date;

  @Column({ name: 'ends_at', type: 'datetime', precision: 3 })
  endsAt!: Date;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @OneToMany(
    () => PromotionServiceTypeOrmEntity,
    (serviceType) => serviceType.promotion,
  )
  serviceTypes!: PromotionServiceTypeOrmEntity[];

  @OneToMany(() => BookingOrmEntity, (booking) => booking.promotion)
  bookings!: BookingOrmEntity[];
}
