import { Module } from '@nestjs/common';
import { PetcareController } from './petcare.controller';
import { PetcareService } from './petcare.service';
import { MysqlPersistenceService } from './mysql-persistence.service';

@Module({
  imports: [],
  controllers: [PetcareController],
  providers: [PetcareService, MysqlPersistenceService],
})
export class AppModule {}
