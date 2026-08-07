import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { PetsApplicationService } from '../../../application/pets.application.service';
import type { Input } from '../../../application/shared/application.utils';
import { CreatePetDto, VaccinationDto } from '../dtos/pet.dto';

@ApiTags('Pets')
@ApiBearerAuth()
@Controller()
export class PetsController {
  constructor(private readonly pets: PetsApplicationService) {}

  @Post('users/:userId/pets')
  @ApiOperation({ summary: 'Registra una mascota para un usuario' })
  @ApiParam({ name: 'userId', example: 'user_123' })
  @ApiBody({ type: CreatePetDto })
  create(@Param('userId') userId: string, @Body() body: Input) {
    return this.pets.create(userId, body);
  }

  @Get('users/:userId/pets')
  @ApiOperation({ summary: 'Lista las mascotas de un usuario' })
  list(@Param('userId') userId: string) {
    return this.pets.list(userId);
  }

  @Post('pets/:petId/vaccinations')
  @ApiOperation({ summary: 'Agrega un registro de vacunación' })
  @ApiParam({ name: 'petId', example: 'pet_123' })
  @ApiBody({ type: VaccinationDto })
  addVaccination(@Param('petId') petId: string, @Body() body: Input) {
    return this.pets.addVaccination(petId, body);
  }
}
