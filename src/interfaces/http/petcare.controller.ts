import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PetcareApplicationService } from '../../application/petcare.application.service';
import type { Input } from '../../domains/shared/input';

@ApiTags('PetCare')
@Controller()
export class PetcareController {
  constructor(private readonly service: PetcareApplicationService) {}

  @Get()
  @ApiOperation({ summary: 'Información básica de la API' })
  root() {
    return 'Hello World!';
  }

  @Get('health')
  @ApiOperation({
    summary: 'Verifica el estado de la API y la persistencia configurada',
  })
  health() {
    return this.service.health();
  }

  @Post('users')
  @ApiOperation({ summary: 'Crea un perfil de usuario' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'email', 'city'],
      properties: {
        name: { type: 'string', example: 'Ana Pérez' },
        email: { type: 'string', format: 'email', example: 'ana@example.com' },
        phone: { type: 'string', example: '+57 300 123 4567' },
        city: { type: 'string', example: 'Bogotá' },
      },
    },
  })
  createUser(@Body() body: Input) {
    return this.service.createUser(body);
  }

  @Post('auth/login')
  @ApiOperation({ summary: 'Identifica un perfil usando el correo' })
  login(@Body() body: Input) {
    return this.service.loginWithEmail(body);
  }

  @Get('users')
  users() {
    return this.service.listUsers();
  }

  @Post('users/:userId/pets')
  @ApiOperation({ summary: 'Registra una mascota para un usuario' })
  createPet(@Param('userId') userId: string, @Body() body: Input) {
    return this.service.createPet(userId, body);
  }

  @Get('users/:userId/pets')
  pets(@Param('userId') userId: string) {
    return this.service.listPets(userId);
  }

  @Post('pets/:petId/vaccinations')
  @ApiOperation({ summary: 'Agrega un registro de vacunación' })
  vaccination(@Param('petId') petId: string, @Body() body: Input) {
    return this.service.addVaccination(petId, body);
  }

  @Get('providers')
  @ApiOperation({
    summary: 'Lista proveedores filtrando por ciudad o servicio',
  })
  providers(@Query() query: Input) {
    return this.service.listProviders(query);
  }

  @Get('providers/:providerId')
  provider(@Param('providerId') providerId: string) {
    return this.service.getProvider(providerId);
  }

  @Get('providers/:providerId/availability')
  @ApiOperation({ summary: 'Consulta capacidad y disponibilidad por fecha' })
  availability(@Param('providerId') providerId: string, @Query() query: Input) {
    return this.service.availability(providerId, query);
  }

  @Get('promotions')
  @ApiOperation({ summary: 'Lista promociones activas' })
  promotions(@Query() query: Input) {
    return this.service.listPromotions(query);
  }

  @Post('promotions')
  @ApiOperation({ summary: 'Crea una promoción nacional o local' })
  createPromotion(@Body() body: Input) {
    return this.service.createPromotion(body);
  }

  @Post('maps/geocode')
  @ApiOperation({ summary: 'Obtiene coordenadas mediante el adaptador mock' })
  geocode(@Body() body: Input) {
    return this.service.geocode(body);
  }

  @Post('users/:userId/bookings')
  @ApiOperation({
    summary: 'Compatibilidad: solicita pago y reserva mediante evento',
    deprecated: true,
  })
  createBooking(@Param('userId') userId: string, @Body() body: Input) {
    return this.service.createBooking(userId, body);
  }

  @Get('bookings')
  bookings(@Query() query: Input) {
    return this.service.listBookings(query);
  }

  @Get('bookings/:bookingId')
  booking(@Param('bookingId') bookingId: string) {
    return this.service.getBooking(bookingId);
  }

  @Patch('bookings/:bookingId/status')
  @ApiOperation({ summary: 'Actualiza o rechaza el estado de una reserva' })
  status(@Param('bookingId') bookingId: string, @Body() body: Input) {
    return this.service.updateBookingStatus(bookingId, body);
  }

  @Post('bookings/:bookingId/reminder')
  @ApiOperation({ summary: 'Genera una notificación mock de recordatorio' })
  reminder(@Param('bookingId') bookingId: string) {
    return this.service.sendReminder(bookingId);
  }

  @Get('users/:userId/notifications')
  notifications(@Param('userId') userId: string) {
    return this.service.listNotifications(userId);
  }

  @Post('payments')
  @ApiOperation({
    summary: 'Crea un pago y publica payment.confirmed para reservar',
  })
  paymentRequest(@Body() body: Input) {
    return this.service.createPayment(body);
  }

  @Post('payments/mock')
  @ApiOperation({ summary: 'Simula un pago sin conectar una pasarela real' })
  payment(@Body() body: Input) {
    return this.service.mockPayment(body);
  }
}
