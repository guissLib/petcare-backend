import { Module } from '@nestjs/common';
import { PETCARE_MAP_GATEWAY } from '../shared-kernel/application/ports/integration.ports';
import { MapsApplicationService } from './application/maps.application.service';
import { GoogleMapsGateway } from './infrastructure/integrations/google-maps.gateway';
import { MapsController } from './presentation/http/controllers/maps.controller';

@Module({
  controllers: [MapsController],
  providers: [
    {
      provide: PETCARE_MAP_GATEWAY,
      useClass: GoogleMapsGateway,
    },
    MapsApplicationService,
  ],
  exports: [MapsApplicationService],
})
export class MapModule {}
