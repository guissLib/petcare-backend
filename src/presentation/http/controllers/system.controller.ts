import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SystemApplicationService } from '../../../application/system.application.service';
import { Public } from '../auth/public.decorator';

@ApiTags('System')
@Controller()
@Public()
export class SystemController {
  constructor(private readonly system: SystemApplicationService) {}

  @Get()
  @ApiOperation({ summary: 'Información básica de la API' })
  root() {
    return 'Hello World!';
  }

  @Get('health')
  @ApiOperation({ summary: 'Verifica el estado de la API y la persistencia' })
  health() {
    return this.system.health();
  }
}
