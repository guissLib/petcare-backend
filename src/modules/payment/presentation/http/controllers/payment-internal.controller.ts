import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Input } from '../../../../shared-kernel/application/shared/application.utils';
import { Public } from '../../../../user/presentation/http/auth/public.decorator';
import type { MockPaymentCard } from '../../../../shared-kernel/application/ports/integration.ports';
import { PaymentsApplicationService } from '../../../application/payments.application.service';

@ApiTags('Internal Payment')
@Controller('internal/payments')
export class PaymentInternalController {
  constructor(private readonly payments: PaymentsApplicationService) {}

  @Post('intents')
  @Public()
  @ApiOperation({ summary: 'Crea una intención de pago para Booking' })
  async createIntent(
    @Body() body: Input,
    @Headers('x-petcare-service-secret') secret: string | undefined,
  ) {
    assertServiceSecret(secret);
    const payment = await this.payments.createIntent(
      requiredText(body.userId, 'userId'),
      requiredNumber(body.amount, 'amount'),
      readMethod(body.method),
      requiredText(body.bookingId, 'bookingId'),
    );
    return payment.toPrimitives();
  }

  @Post(':paymentId/mock-charge')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Procesa un pago mock solicitado por Booking' })
  async charge(
    @Param('paymentId') paymentId: string,
    @Body() body: Input,
    @Headers('x-petcare-service-secret') secret: string | undefined,
  ) {
    assertServiceSecret(secret);
    const payment = await this.payments.chargeForBooking({
      paymentId: requiredText(paymentId, 'paymentId'),
      bookingId: requiredText(body.bookingId, 'bookingId'),
      userId: requiredText(body.userId, 'userId'),
      providerId: requiredText(body.providerId, 'providerId'),
      amount: requiredNumber(body.amount, 'amount'),
      card: readCard(body),
    });
    return payment.toPrimitives();
  }

  @Post(':paymentId/confirm-at-location')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Publica la confirmación de un pago presencial' })
  async confirmAtLocation(
    @Param('paymentId') paymentId: string,
    @Body() body: Input,
    @Headers('x-petcare-service-secret') secret: string | undefined,
  ) {
    assertServiceSecret(secret);
    await this.payments.confirmAtLocation({
      paymentId: requiredText(paymentId, 'paymentId'),
      bookingId: requiredText(body.bookingId, 'bookingId'),
      userId: requiredText(body.userId, 'userId'),
      providerId: requiredText(body.providerId, 'providerId'),
      amount: requiredNumber(body.amount, 'amount'),
    });
    return { published: true };
  }

  @Post(':paymentId/publish-confirmed')
  @Public()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Publica payment.confirmed después de persistir Booking',
  })
  async publishConfirmed(
    @Param('paymentId') paymentId: string,
    @Body() body: Input,
    @Headers('x-petcare-service-secret') secret: string | undefined,
  ) {
    assertServiceSecret(secret);
    await this.payments.publishBookingConfirmation({
      paymentId: requiredText(paymentId, 'paymentId'),
      bookingId: requiredText(body.bookingId, 'bookingId'),
      userId: requiredText(body.userId, 'userId'),
      providerId: requiredText(body.providerId, 'providerId'),
      amount: requiredNumber(body.amount, 'amount'),
    });
    return { published: true };
  }

  @Post(':paymentId/cancel-pending')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Compensa una intención de pago no persistida' })
  async cancelPending(
    @Param('paymentId') paymentId: string,
    @Headers('x-petcare-service-secret') secret: string | undefined,
  ) {
    assertServiceSecret(secret);
    await this.payments.cancelPending(requiredText(paymentId, 'paymentId'));
    return { cancelled: true };
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

function requiredText(value: unknown, field: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ForbiddenException(`${field} es requerido`);
  }
  return value.trim();
}

function requiredNumber(value: unknown, field: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ForbiddenException(`${field} es requerido`);
  }
  return value;
}

function readMethod(value: unknown) {
  if (value === 'online' || value === 'at-location') {
    return value;
  }
  throw new ForbiddenException('method no es válido');
}

function readCard(_input: Input): MockPaymentCard {
  return {};
}
