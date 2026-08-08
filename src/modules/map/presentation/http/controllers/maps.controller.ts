import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MapsApplicationService } from '../../../application/maps.application.service';
import type { Input } from '../../../../shared-kernel/application/shared/application.utils';
import { GeocodeDto } from '../dtos/map.dto';

@ApiTags('Maps')
@ApiBearerAuth()
@Controller('maps')
export class MapsController {
  constructor(private readonly maps: MapsApplicationService) {}

  @Get('config')
  @ApiOperation({ summary: 'Obtiene la configuración pública de Google Maps' })
  config() {
    return this.maps.publicConfig();
  }

  @Post('geocode')
  @ApiOperation({ summary: 'Geocodifica una dirección mediante un adaptador' })
  @ApiBody({ type: GeocodeDto })
  geocode(@Body() body: Input) {
    return this.maps.geocode(body);
  }
}
