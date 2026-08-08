import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '../user/user.module';
import { PET_REPOSITORY } from './domain/repositories/pet.repository';
import { PetsApplicationService } from './application/pets.application.service';
import { PetOrmEntity } from './infrastructure/persistence/entities/pet.orm-entity';
import { PetVaccinationOrmEntity } from './infrastructure/persistence/entities/pet-vaccination.orm-entity';
import { TypeOrmPetRepository } from './infrastructure/persistence/repositories/typeorm-pet.repository';
import { PetsController } from './presentation/http/controllers/pets.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([PetOrmEntity, PetVaccinationOrmEntity]),
    forwardRef(() => UserModule),
  ],
  controllers: [PetsController],
  providers: [
    TypeOrmPetRepository,
    {
      provide: PET_REPOSITORY,
      useExisting: TypeOrmPetRepository,
    },
    PetsApplicationService,
  ],
  exports: [PET_REPOSITORY, PetsApplicationService],
})
export class PetModule {}
