import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ProvidersApplicationService } from '../../../application/providers.application.service';
import type { Input } from '../../../../shared-kernel/application/shared/application.utils';

@ApiTags('Providers')
@ApiBearerAuth()
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providers: ProvidersApplicationService) {}

  @Get()
  @ApiOperation({ summary: 'Lista proveedores por ciudad o servicio' })
  @ApiQuery({ name: 'city', required: false, example: 'Bogotá' })
  @ApiQuery({
    name: 'serviceType',
    required: false,
    enum: [
      'grooming',
      'walking',
      'boarding',
      'veterinary',
      'home-visit',
      'cleaning',
    ],
  })
  list(@Query() query: Input) {
    return this.providers.list(query);
  }

  @Get(':providerId')
  @ApiOperation({ summary: 'Obtiene un proveedor por id' })
  @ApiParam({ name: 'providerId', example: 'provider_centro' })
  getById(@Param('providerId') providerId: string) {
    return this.providers.getById(providerId).then((provider) => {
      return provider.toPrimitives();
    });
  }

  @Get(':providerId/availability')
  @ApiOperation({ summary: 'Consulta capacidad y disponibilidad por fecha' })
  @ApiParam({ name: 'providerId', example: 'provider_centro' })
  @ApiQuery({ name: 'date', required: true, example: '2026-09-15' })
  availability(@Param('providerId') providerId: string, @Query() query: Input) {
    return this.providers.availability(providerId, query);
  }
}
