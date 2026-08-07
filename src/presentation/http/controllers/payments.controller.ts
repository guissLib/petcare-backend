import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentsApplicationService } from '../../../application/payments.application.service';
import type { Input } from '../../../application/shared/application.utils';
import { CreatePaymentDto } from '../dtos/payment.dto';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsApplicationService) {}

  @Post()
  @ApiOperation({ summary: 'Simula un pago sin integrar una pasarela real' })
  @ApiBody({ type: CreatePaymentDto })
  create(@Body() body: Input) {
    return this.payments.create(body).then((payment) => payment.toPrimitives());
  }

  @Post('mock')
  @ApiOperation({ summary: 'Alias compatible para simular un pago' })
  @ApiBody({ type: CreatePaymentDto })
  createMock(@Body() body: Input) {
    return this.payments.create(body).then((payment) => payment.toPrimitives());
  }
}
