import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { BookingOrmEntity } from '../../../../booking/infrastructure/persistence/entities/booking.orm-entity';
import { ProviderScheduleOrmEntity } from './provider-schedule.orm-entity';
import { ProviderServiceOrmEntity } from './provider-service.orm-entity';
import { UserOrmEntity } from '../../../../user/infrastructure/persistence/entities/user.orm-entity';

@Entity({ name: 'providers' })
@Index('IDX_providers_city', ['city'])
@Index('UQ_providers_operator_user_id', ['operatorUserId'], { unique: true })
export class ProviderOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Column({
    name: 'operator_user_id',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  operatorUserId!: string | null;

  @ManyToOne(() => UserOrmEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'operator_user_id', referencedColumnName: 'id' })
  operatorUser!: UserOrmEntity | null;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 20 })
  type!: string;

  @Column({ type: 'varchar', length: 120 })
  city!: string;

  @Column({ type: 'varchar', length: 255 })
  address!: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude!: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude!: string;

  @Column({ type: 'int', unsigned: true })
  capacity!: number;

  @Column({ name: 'accepts_home_visits', type: 'boolean', default: false })
  acceptsHomeVisits!: boolean;

  @OneToMany(() => ProviderServiceOrmEntity, (service) => service.provider)
  services!: ProviderServiceOrmEntity[];

  @OneToMany(() => ProviderScheduleOrmEntity, (schedule) => schedule.provider)
  schedules!: ProviderScheduleOrmEntity[];

  @OneToMany(() => BookingOrmEntity, (booking) => booking.provider)
  bookings!: BookingOrmEntity[];
}
