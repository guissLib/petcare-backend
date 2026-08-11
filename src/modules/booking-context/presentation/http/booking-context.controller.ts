import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Input } from '../../../shared-kernel/application/shared/application.utils';
import { Public } from '../../../user/presentation/http/auth/public.decorator';
import { BookingContextApplicationService } from '../../application/booking-context.application.service';

@ApiTags('Internal Booking Context')
@Controller('internal')
export class BookingContextController {
  constructor(private readonly context: BookingContextApplicationService) {}

  @Post('booking-context')
  @Public()
  @ApiOperation({
    summary: 'Contrato interno para validar el contexto de una reserva',
  })
  get(
    @Body() body: Input,
    @Headers('x-petcare-service-secret') secret: string | undefined,
  ) {
    assertServiceSecret(secret);
    return this.context.get(body);
  }
}

function assertServiceSecret(secret: string | undefined) {
  const expected =
    process.env.PETCARE_SERVICE_SECRET ??
    (process.env.NODE_ENV === 'production' ? '' : 'petcare-local-service');
  if (!expected || secret !== expected) {
    throw new ForbiddenException('Credenciales de servicio inválidas');
  }
}
