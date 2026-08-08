import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentsApplicationService } from '../../../application/payments.application.service';
import type { Input } from '../../../../shared-kernel/application/shared/application.utils';
import { CreatePaymentDto } from '../dtos/payment.dto';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsApplicationService) {}

  @Post()
  @ApiOperation({
    summary:
      'Compatibilidad: simula un pago; para reservas use el checkout contextual',
  })
  @ApiBody({ type: CreatePaymentDto })
  create(@Body() body: Input) {
    return this.payments.create(body).then((payment) => payment.toPrimitives());
  }

  @Post('mock')
  @ApiOperation({
    summary: 'Compatibilidad: alias para simular un pago fuera de una reserva',
  })
  @ApiBody({ type: CreatePaymentDto })
  createMock(@Body() body: Input) {
    return this.payments.create(body).then((payment) => payment.toPrimitives());
  }
}
