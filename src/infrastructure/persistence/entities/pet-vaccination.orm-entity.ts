import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { PetOrmEntity } from './pet.orm-entity';

@Entity({ name: 'pet_vaccinations' })
export class PetVaccinationOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Column({ name: 'pet_id', type: 'varchar', length: 64 })
  petId!: string;

  @ManyToOne(() => PetOrmEntity, (pet) => pet.vaccinations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'pet_id', referencedColumnName: 'id' })
  pet!: PetOrmEntity;

  @Column({ type: 'varchar', length: 120 })
  vaccine!: string;

  @Column({ name: 'administered_at', type: 'datetime', precision: 3 })
  administeredAt!: Date;

  @Column({
    name: 'expires_at',
    type: 'datetime',
    precision: 3,
    nullable: true,
  })
  expiresAt!: Date | null;

  @Column({
    name: 'document_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  documentUrl!: string | null;
}
