import { Column, Entity, Index, OneToMany, PrimaryColumn } from 'typeorm';
import { BookingOrmEntity } from './booking.orm-entity';
import { NotificationOrmEntity } from './notification.orm-entity';
import { PetOrmEntity } from './pet.orm-entity';

@Entity({ name: 'users' })
@Index('UQ_users_email', ['email'], { unique: true })
export class UserOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 320 })
  email!: string;

  @Column({ type: 'varchar', length: 20 })
  role!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  city!: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone!: string | null;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt!: Date;

  @OneToMany(() => PetOrmEntity, (pet) => pet.owner)
  pets!: PetOrmEntity[];

  @OneToMany(() => BookingOrmEntity, (booking) => booking.user)
  bookings!: BookingOrmEntity[];

  @OneToMany(() => NotificationOrmEntity, (notification) => notification.user)
  notifications!: NotificationOrmEntity[];
}
