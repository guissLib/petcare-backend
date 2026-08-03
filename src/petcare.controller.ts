import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PetcareService } from './petcare.service';

@ApiTags('PetCare')
@Controller()
export class PetcareController {
  constructor(private readonly service: PetcareService) {}

  @Get()
  @ApiOperation({ summary: 'Información básica de la API' })
  root() { return 'Hello World!'; }
  @Get('health')
  @ApiOperation({ summary: 'Verifica el estado de la API y la persistencia configurada' })
  health() { return this.service.health(); }

  @Post('users')
  @ApiOperation({ summary: 'Crea un perfil de usuario' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'email', 'city'],
      properties: {
        name: { type: 'string', example: 'Ana P\u00e9rez' },
        email: { type: 'string', format: 'email', example: 'ana@example.com' },
        phone: { type: 'string', example: '+57 300 123 4567' },
        city: { type: 'string', example: 'Bogot\u00e1' },
      },
    },
  })
  createUser(@Body() body: any) { return this.service.createUser(body); }
  @Post('auth/login')
  @ApiOperation({ summary: 'Identifica o crea el perfil mínimo usando solo el correo' })
  login(@Body() body: any) { return this.service.loginWithEmail(body); }
  @Get('users')
  users() { return this.service.listUsers(); }
  @Post('users/:userId/pets')
  @ApiOperation({ summary: 'Registra una mascota para un usuario' })
  createPet(@Param('userId') userId: string, @Body() body: any) { return this.service.createPet(userId, body); }
  @Get('users/:userId/pets')
  pets(@Param('userId') userId: string) { return this.service.listPets(userId); }
  @Post('pets/:petId/vaccinations')
  @ApiOperation({ summary: 'Agrega un registro de vacunación' })
  vaccination(@Param('petId') petId: string, @Body() body: any) { return this.service.addVaccination(petId, body); }

  @Get('providers')
  @ApiOperation({ summary: 'Lista proveedores filtrando por ciudad o servicio' })
  providers(@Query() query: any) { return this.service.listProviders(query); }
  @Get('providers/:providerId')
  provider(@Param('providerId') providerId: string) { return this.service.getProvider(providerId); }
  @Get('providers/:providerId/availability')
  @ApiOperation({ summary: 'Consulta capacidad y disponibilidad por fecha' })
  availability(@Param('providerId') providerId: string, @Query() query: any) { return this.service.availability(providerId, query); }

  @Get('promotions')
  @ApiOperation({ summary: 'Lista promociones activas' })
  promotions(@Query() query: any) { return this.service.listPromotions(query); }
  @Post('promotions')
  @ApiOperation({ summary: 'Crea una promoción nacional o local' })
  createPromotion(@Body() body: any) { return this.service.createPromotion(body); }
  @Post('maps/geocode')
  @ApiOperation({ summary: 'Obtiene coordenadas usando el adaptador de mapas mock' })
  geocode(@Body() body: any) { return this.service.geocode(body); }

  @Post('users/:userId/bookings')
  @ApiOperation({ summary: 'Crea una reserva y procesa el pago mock' })
  createBooking(@Param('userId') userId: string, @Body() body: any) { return this.service.createBooking(userId, body); }
  @Get('bookings')
  bookings(@Query() query: any) { return this.service.listBookings(query); }
  @Get('bookings/:bookingId')
  booking(@Param('bookingId') bookingId: string) { return this.service.getBooking(bookingId); }
  @Patch('bookings/:bookingId/status')
  @ApiOperation({ summary: 'Actualiza o rechaza el estado de una reserva' })
  status(@Param('bookingId') bookingId: string, @Body() body: any) { return this.service.updateBookingStatus(bookingId, body); }
  @Post('bookings/:bookingId/reminder')
  @ApiOperation({ summary: 'Genera una notificación mock de recordatorio' })
  reminder(@Param('bookingId') bookingId: string) { return this.service.sendReminder(bookingId); }
  @Get('users/:userId/notifications')
  notifications(@Param('userId') userId: string) { return this.service.listNotifications(userId); }
  @Post('payments/mock')
  @ApiOperation({ summary: 'Simula un pago sin conectar una pasarela real' })
  payment(@Body() body: any) { return this.service.mockPayment(body); }
}
