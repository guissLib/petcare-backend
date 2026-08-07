import { Column, Entity, Index, OneToOne, PrimaryColumn } from 'typeorm';
import { BookingOrmEntity } from './booking.orm-entity';

@Entity({ name: 'payments' })
@Index('UQ_payments_reference', ['reference'], { unique: true })
export class PaymentOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

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

  @OneToOne(() => BookingOrmEntity, (booking) => booking.payment)
  booking!: BookingOrmEntity | null;
}
