import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { BookingOrmEntity } from './booking.orm-entity';
import { UserOrmEntity } from './user.orm-entity';

@Entity({ name: 'notifications' })
@Index('IDX_notifications_user_sent_at', ['userId', 'sentAt'])
export class NotificationOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Column({ name: 'user_id', type: 'varchar', length: 64 })
  userId!: string;

  @ManyToOne(() => UserOrmEntity, (user) => user.notifications, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user!: UserOrmEntity;

  @Column({ name: 'booking_id', type: 'varchar', length: 64, nullable: true })
  bookingId!: string | null;

  @ManyToOne(() => BookingOrmEntity, (booking) => booking.notifications, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'booking_id', referencedColumnName: 'id' })
  booking!: BookingOrmEntity | null;

  @Column({ type: 'varchar', length: 20 })
  type!: string;

  @Column({ type: 'varchar', length: 500 })
  message!: string;

  @Column({ type: 'varchar', length: 32 })
  channel!: string;

  @Column({ name: 'sent_at', type: 'datetime', precision: 3 })
  sentAt!: Date;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  read!: boolean;
}
