import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBody,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { BookingsApplicationService } from '../../../application/bookings.application.service';
import type { Input } from '../../../../shared-kernel/application/shared/application.utils';
import { CreateBookingDto, UpdateBookingStatusDto } from '../dtos/booking.dto';
import { MockCardPaymentDto } from '../../../../payment/presentation/http/dtos/payment.dto';
import type { Request } from 'express';
import { getAuthenticatedActor } from '../../../../user/infrastructure/security/jwt-auth.guard';

@ApiTags('Bookings')
@ApiBearerAuth()
@Controller()
export class BookingsController {
  constructor(private readonly bookings: BookingsApplicationService) {}

  @Post('users/:userId/bookings')
  @ApiOperation({
    summary:
      'Crea una reserva; los pagos online quedan pendientes para checkout',
  })
  @ApiParam({ name: 'userId', example: 'user_123' })
  @ApiBody({ type: CreateBookingDto })
  create(
    @Param('userId') userId: string,
    @Body() body: Input,
    @Req() request: Request,
  ) {
    return this.bookings.create(userId, body, getAuthenticatedActor(request));
  }

  @Post('bookings/:bookingId/payments/mock')
  @ApiOperation({ summary: 'Procesa el pago mock de una reserva pendiente' })
  @ApiParam({ name: 'bookingId', example: 'booking_123' })
  @ApiBody({ type: MockCardPaymentDto })
  pay(
    @Param('bookingId') bookingId: string,
    @Body() body: Input,
    @Req() request: Request,
  ) {
    return this.bookings.pay(bookingId, body, getAuthenticatedActor(request));
  }

  @Post('users/:userId/bookings/quote')
  @ApiOperation({ summary: 'Calcula el precio de una reserva antes del pago' })
  @ApiParam({ name: 'userId', example: 'user_123' })
  @ApiBody({ type: CreateBookingDto })
  quote(
    @Param('userId') userId: string,
    @Body() body: Input,
    @Req() request: Request,
  ) {
    return this.bookings.quote(userId, body, getAuthenticatedActor(request));
  }

  @Get('bookings')
  @ApiOperation({ summary: 'Lista reservas con filtros opcionales' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'providerId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'paymentId', required: false })
  list(@Query() query: Input, @Req() request: Request) {
    return this.bookings.list(query, getAuthenticatedActor(request));
  }

  @Get('bookings/:bookingId')
  @ApiOperation({ summary: 'Obtiene una reserva por id' })
  @ApiParam({ name: 'bookingId', example: 'booking_123' })
  getById(@Param('bookingId') bookingId: string, @Req() request: Request) {
    return this.bookings.getById(bookingId, getAuthenticatedActor(request));
  }

  @Patch('bookings/:bookingId/status')
  @ApiOperation({ summary: 'Actualiza el estado de una reserva' })
  @ApiParam({ name: 'bookingId', example: 'booking_123' })
  @ApiBody({ type: UpdateBookingStatusDto })
  updateStatus(
    @Param('bookingId') bookingId: string,
    @Body() body: Input,
    @Req() request: Request,
  ) {
    return this.bookings.updateStatus(
      bookingId,
      body,
      getAuthenticatedActor(request),
    );
  }

  @Post('bookings/:bookingId/reminder')
  @ApiOperation({ summary: 'Genera un recordatorio de reserva' })
  @ApiParam({ name: 'bookingId', example: 'booking_123' })
  reminder(@Param('bookingId') bookingId: string, @Req() request: Request) {
    return this.bookings.sendReminder(
      bookingId,
      getAuthenticatedActor(request),
    );
  }
}
