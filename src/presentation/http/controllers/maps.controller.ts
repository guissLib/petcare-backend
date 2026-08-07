import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MapsApplicationService } from '../../../application/maps.application.service';
import type { Input } from '../../../application/shared/application.utils';
import { GeocodeDto } from '../dtos/map.dto';

@ApiTags('Maps')
@ApiBearerAuth()
@Controller('maps')
export class MapsController {
  constructor(private readonly maps: MapsApplicationService) {}

  @Post('geocode')
  @ApiOperation({ summary: 'Geocodifica una dirección mediante un adaptador' })
  @ApiBody({ type: GeocodeDto })
  geocode(@Body() body: Input) {
    return this.maps.geocode(body);
  }
}
