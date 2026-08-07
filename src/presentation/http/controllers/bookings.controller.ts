import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
import type { Input } from '../../../application/shared/application.utils';
import { CreateBookingDto, UpdateBookingStatusDto } from '../dtos/booking.dto';

@ApiTags('Bookings')
@ApiBearerAuth()
@Controller()
export class BookingsController {
  constructor(private readonly bookings: BookingsApplicationService) {}

  @Post('users/:userId/bookings')
  @ApiOperation({
    summary:
      'Crea una reserva y procesa el pago mediante el gateway configurado',
  })
  @ApiParam({ name: 'userId', example: 'user_123' })
  @ApiBody({ type: CreateBookingDto })
  create(@Param('userId') userId: string, @Body() body: Input) {
    return this.bookings.create(userId, body);
  }

  @Get('bookings')
  @ApiOperation({ summary: 'Lista reservas con filtros opcionales' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'providerId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'paymentId', required: false })
  list(@Query() query: Input) {
    return this.bookings.list(query);
  }

  @Get('bookings/:bookingId')
  @ApiOperation({ summary: 'Obtiene una reserva por id' })
  @ApiParam({ name: 'bookingId', example: 'booking_123' })
  getById(@Param('bookingId') bookingId: string) {
    return this.bookings.getById(bookingId);
  }

  @Patch('bookings/:bookingId/status')
  @ApiOperation({ summary: 'Actualiza el estado de una reserva' })
  @ApiParam({ name: 'bookingId', example: 'booking_123' })
  @ApiBody({ type: UpdateBookingStatusDto })
  updateStatus(@Param('bookingId') bookingId: string, @Body() body: Input) {
    return this.bookings.updateStatus(bookingId, body);
  }

  @Post('bookings/:bookingId/reminder')
  @ApiOperation({ summary: 'Genera un recordatorio de reserva' })
  @ApiParam({ name: 'bookingId', example: 'booking_123' })
  reminder(@Param('bookingId') bookingId: string) {
    return this.bookings.sendReminder(bookingId);
  }
}
