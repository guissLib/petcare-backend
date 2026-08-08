import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { NotificationOrmEntity } from '../../../../notification/infrastructure/persistence/entities/notification.orm-entity';
import { PaymentOrmEntity } from '../../../../payment/infrastructure/persistence/entities/payment.orm-entity';
import { PetOrmEntity } from '../../../../pet/infrastructure/persistence/entities/pet.orm-entity';
import { PromotionOrmEntity } from '../../../../promotion/infrastructure/persistence/entities/promotion.orm-entity';
import { ProviderOrmEntity } from '../../../../provider/infrastructure/persistence/entities/provider.orm-entity';
import { UserOrmEntity } from '../../../../user/infrastructure/persistence/entities/user.orm-entity';

@Entity({ name: 'bookings' })
@Index('IDX_bookings_user_id', ['userId'])
@Index('IDX_bookings_provider_date', ['providerId', 'scheduledAt'])
@Index('IDX_bookings_status_date', ['status', 'scheduledAt'])
@Index('UQ_bookings_payment_id', ['paymentId'], { unique: true })
@Index('UQ_bookings_idempotency_key', ['idempotencyKey'], { unique: true })
export class BookingOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Column({ name: 'user_id', type: 'varchar', length: 64 })
  userId!: string;

  @ManyToOne(() => UserOrmEntity, (user) => user.bookings, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user!: UserOrmEntity;

  @Column({ name: 'pet_id', type: 'varchar', length: 64 })
  petId!: string;

  @ManyToOne(() => PetOrmEntity, (pet) => pet.bookings, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'pet_id', referencedColumnName: 'id' })
  pet!: PetOrmEntity;

  @Column({ name: 'provider_id', type: 'varchar', length: 64 })
  providerId!: string;

  @ManyToOne(() => ProviderOrmEntity, (provider) => provider.bookings, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'provider_id', referencedColumnName: 'id' })
  provider!: ProviderOrmEntity;

  @Column({ name: 'service_type', type: 'varchar', length: 32 })
  serviceType!: string;

  @Column({ name: 'visit_mode', type: 'varchar', length: 20 })
  visitMode!: string;

  @Column({ name: 'scheduled_at', type: 'datetime', precision: 3 })
  scheduledAt!: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address!: string | null;

  @Column({
    name: 'address_reference',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  addressReference!: string | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
  })
  latitude!: string | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
  })
  longitude!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  notes!: string | null;

  @Column({ type: 'varchar', length: 20 })
  status!: string;

  @Column({ type: 'int', unsigned: true })
  total!: number;

  @Column({ name: 'original_total', type: 'int', unsigned: true })
  originalTotal!: number;

  @Column({ name: 'discount_amount', type: 'int', unsigned: true })
  discountAmount!: number;

  @Column({ type: 'char', length: 3, default: 'COP' })
  currency!: string;

  @Column({ name: 'payment_method', type: 'varchar', length: 16 })
  paymentMethod!: string;

  @Column({ name: 'payment_id', type: 'varchar', length: 64 })
  paymentId!: string;

  @Column({
    name: 'payment_expires_at',
    type: 'datetime',
    precision: 3,
    nullable: true,
  })
  paymentExpiresAt!: Date | null;

  @Column({
    name: 'idempotency_key',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  idempotencyKey!: string | null;

  @OneToOne(() => PaymentOrmEntity, (payment) => payment.booking, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'payment_id', referencedColumnName: 'id' })
  payment!: PaymentOrmEntity;

  @Column({ name: 'promotion_id', type: 'varchar', length: 64, nullable: true })
  promotionId!: string | null;

  @ManyToOne(() => PromotionOrmEntity, (promotion) => promotion.bookings, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'promotion_id', referencedColumnName: 'id' })
  promotion!: PromotionOrmEntity | null;

  @Column({
    name: 'rejection_reason',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  rejectionReason!: string | null;

  @Column({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt!: Date;

  @OneToMany(
    () => NotificationOrmEntity,
    (notification) => notification.booking,
  )
  notifications!: NotificationOrmEntity[];
}
