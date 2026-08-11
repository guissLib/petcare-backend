import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'payments' })
@Index('UQ_payments_reference', ['reference'], { unique: true })
@Index('IDX_payments_booking_id', ['bookingId'])
export class PaymentOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Column({ name: 'user_id', type: 'varchar', length: 64, nullable: true })
  userId!: string | null;

  @Column({ name: 'booking_id', type: 'varchar', length: 64, nullable: true })
  bookingId!: string | null;

  @Column({ type: 'varchar', length: 16 })
  method!: string;

  @Column({ type: 'varchar', length: 16 })
  status!: string;

  @Column({ type: 'int', unsigned: true })
  amount!: number;

  @Column({ type: 'char', length: 3, default: 'COP' })
  currency!: string;

  @Column({ type: 'varchar', length: 32 })
  provider!: string;

  @Column({ type: 'varchar', length: 160 })
  reference!: string;

  @Column({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt!: Date;

  @Column({ name: 'paid_at', type: 'datetime', precision: 3, nullable: true })
  paidAt!: Date | null;

  @Column({
    name: 'failure_reason',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  failureReason!: string | null;

  @Column({ type: 'int', unsigned: true, default: 0 })
  attempts!: number;
}
