import { Module } from '@nestjs/common';
import { PERSISTENCE_HEALTH } from './application/ports/persistence-health.port';
import { SystemApplicationService } from './application/system.application.service';
import { TypeOrmPersistenceHealth } from './infrastructure/persistence/typeorm-persistence-health';
import { SystemController } from './presentation/http/controllers/system.controller';

@Module({
  controllers: [SystemController],
  providers: [
    {
      provide: PERSISTENCE_HEALTH,
      useClass: TypeOrmPersistenceHealth,
    },
    SystemApplicationService,
  ],
  exports: [SystemApplicationService],
})
export class SystemModule {}
