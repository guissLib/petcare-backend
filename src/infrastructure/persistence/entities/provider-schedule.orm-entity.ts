import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { ProviderOrmEntity } from './provider.orm-entity';

@Entity({ name: 'provider_schedules' })
export class ProviderScheduleOrmEntity {
  @PrimaryColumn({ name: 'provider_id', type: 'varchar', length: 64 })
  providerId!: string;

  @PrimaryColumn({ name: 'day_of_week', type: 'tinyint', unsigned: true })
  dayOfWeek!: number;

  @Column({ name: 'start_time', type: 'time' })
  startTime!: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime!: string;

  @ManyToOne(() => ProviderOrmEntity, (provider) => provider.schedules, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'provider_id', referencedColumnName: 'id' })
  provider!: ProviderOrmEntity;
}
