import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { PetcareService } from './petcare.service';

@Controller()
export class PetcareController {
  constructor(private readonly service: PetcareService) {}

  @Get()
  root() { return 'Hello World!'; }
  @Get('health')
  health() { return this.service.health(); }

  @Post('users')
  createUser(@Body() body: any) { return this.service.createUser(body); }
  @Get('users')
  users() { return this.service.listUsers(); }
  @Post('users/:userId/pets')
  createPet(@Param('userId') userId: string, @Body() body: any) { return this.service.createPet(userId, body); }
  @Get('users/:userId/pets')
  pets(@Param('userId') userId: string) { return this.service.listPets(userId); }
  @Post('pets/:petId/vaccinations')
  vaccination(@Param('petId') petId: string, @Body() body: any) { return this.service.addVaccination(petId, body); }

  @Get('providers')
  providers(@Query() query: any) { return this.service.listProviders(query); }
  @Get('providers/:providerId')
  provider(@Param('providerId') providerId: string) { return this.service.getProvider(providerId); }
  @Get('providers/:providerId/availability')
  availability(@Param('providerId') providerId: string, @Query() query: any) { return this.service.availability(providerId, query); }

  @Get('promotions')
  promotions(@Query() query: any) { return this.service.listPromotions(query); }
  @Post('promotions')
  createPromotion(@Body() body: any) { return this.service.createPromotion(body); }
  @Post('maps/geocode')
  geocode(@Body() body: any) { return this.service.geocode(body); }

  @Post('users/:userId/bookings')
  createBooking(@Param('userId') userId: string, @Body() body: any) { return this.service.createBooking(userId, body); }
  @Get('bookings')
  bookings(@Query() query: any) { return this.service.listBookings(query); }
  @Get('bookings/:bookingId')
  booking(@Param('bookingId') bookingId: string) { return this.service.getBooking(bookingId); }
  @Patch('bookings/:bookingId/status')
  status(@Param('bookingId') bookingId: string, @Body() body: any) { return this.service.updateBookingStatus(bookingId, body); }
  @Post('bookings/:bookingId/reminder')
  reminder(@Param('bookingId') bookingId: string) { return this.service.sendReminder(bookingId); }
  @Get('users/:userId/notifications')
  notifications(@Param('userId') userId: string) { return this.service.listNotifications(userId); }
  @Post('payments/mock')
  payment(@Body() body: any) { return this.service.mockPayment(body); }
}
