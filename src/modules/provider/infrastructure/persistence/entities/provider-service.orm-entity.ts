import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { ProviderOrmEntity } from './provider.orm-entity';

@Entity({ name: 'provider_services' })
export class ProviderServiceOrmEntity {
  @PrimaryColumn({ name: 'provider_id', type: 'varchar', length: 64 })
  providerId!: string;

  @PrimaryColumn({ name: 'service_type', type: 'varchar', length: 32 })
  serviceType!: string;

  @ManyToOne(() => ProviderOrmEntity, (provider) => provider.services, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'provider_id', referencedColumnName: 'id' })
  provider!: ProviderOrmEntity;
}
