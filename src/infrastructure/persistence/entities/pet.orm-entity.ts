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
import { PetVaccinationOrmEntity } from './pet-vaccination.orm-entity';
import { UserOrmEntity } from './user.orm-entity';

@Entity({ name: 'pets' })
@Index('IDX_pets_owner_id', ['ownerId'])
export class PetOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Column({ name: 'owner_id', type: 'varchar', length: 64 })
  ownerId!: string;

  @ManyToOne(() => UserOrmEntity, (user) => user.pets, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'owner_id', referencedColumnName: 'id' })
  owner!: UserOrmEntity;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 16 })
  species!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  breed!: string | null;

  @Column({
    name: 'weight_kg',
    type: 'decimal',
    precision: 7,
    scale: 2,
    nullable: true,
  })
  weightKg!: string | null;

  @Column({
    name: 'special_handling',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  specialHandling!: string | null;

  @OneToMany(() => PetVaccinationOrmEntity, (vaccination) => vaccination.pet)
  vaccinations!: PetVaccinationOrmEntity[];

  @OneToMany(() => BookingOrmEntity, (booking) => booking.pet)
  bookings!: BookingOrmEntity[];
}
