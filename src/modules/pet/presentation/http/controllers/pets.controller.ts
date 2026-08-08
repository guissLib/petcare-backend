import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { PetsApplicationService } from '../../../application/pets.application.service';
import type { Input } from '../../../../shared-kernel/application/shared/application.utils';
import { CreatePetDto } from '../dtos/pet.dto';
import type { Request } from 'express';
import { getAuthenticatedActor } from '../../../../user/infrastructure/security/jwt-auth.guard';

interface UploadedHttpFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

@ApiTags('Pets')
@ApiBearerAuth()
@Controller()
export class PetsController {
  constructor(private readonly pets: PetsApplicationService) {}

  @Post('users/:userId/pets')
  @ApiOperation({ summary: 'Registra una mascota para un usuario' })
  @ApiParam({ name: 'userId', example: 'user_123' })
  @ApiBody({ type: CreatePetDto })
  create(
    @Param('userId') userId: string,
    @Body() body: Input,
    @Req() request: Request,
  ) {
    return this.pets.create(userId, body, getAuthenticatedActor(request));
  }

  @Get('users/:userId/pets')
  @ApiOperation({ summary: 'Lista las mascotas de un usuario' })
  list(@Param('userId') userId: string, @Req() request: Request) {
    return this.pets.list(userId, getAuthenticatedActor(request));
  }

  @Post('pets/:petId/vaccinations')
  @UseInterceptors(FileInterceptor('document'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Agrega un registro de vacunación' })
  @ApiParam({ name: 'petId', example: 'pet_123' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['vaccine', 'administeredAt', 'document'],
      properties: {
        vaccine: { type: 'string', example: 'Rabia' },
        administeredAt: { type: 'string', format: 'date-time' },
        expiresAt: { type: 'string', format: 'date-time' },
        document: { type: 'string', format: 'binary' },
      },
    },
  })
  addVaccination(
    @Param('petId') petId: string,
    @Body() body: Input,
    @UploadedFile() file: UploadedHttpFile | undefined,
    @Req() request: Request,
  ) {
    return this.pets.addVaccination(
      petId,
      body,
      toUploadedPdf(file),
      getAuthenticatedActor(request),
    );
  }

  @Put('pets/:petId/vaccinations/:vaccinationId/document')
  @UseInterceptors(FileInterceptor('document'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Reemplaza el carnet de vacunación en PDF' })
  @ApiParam({ name: 'petId', example: 'pet_123' })
  @ApiParam({ name: 'vaccinationId', example: 'vax_123' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['document'],
      properties: {
        document: { type: 'string', format: 'binary' },
      },
    },
  })
  updateVaccinationDocument(
    @Param('petId') petId: string,
    @Param('vaccinationId') vaccinationId: string,
    @UploadedFile() file: UploadedHttpFile | undefined,
    @Req() request: Request,
  ) {
    return this.pets.updateVaccinationDocument(
      petId,
      vaccinationId,
      toUploadedPdf(file),
      getAuthenticatedActor(request),
    );
  }

  @Get('pets/:petId/vaccinations/:vaccinationId/document')
  @ApiOperation({ summary: 'Descarga el carnet de vacunación autenticado' })
  @ApiParam({ name: 'petId', example: 'pet_123' })
  @ApiParam({ name: 'vaccinationId', example: 'vax_123' })
  async downloadVaccinationDocument(
    @Param('petId') petId: string,
    @Param('vaccinationId') vaccinationId: string,
    @Req() request: Request,
  ) {
    const document = await this.pets.downloadVaccinationDocument(
      petId,
      vaccinationId,
      getAuthenticatedActor(request),
    );
    return new StreamableFile(Buffer.from(document.content), {
      type: document.mimeType,
      disposition: `attachment; filename="${document.originalName}"`,
      length: document.size,
    });
  }
}

function toUploadedPdf(file: UploadedHttpFile | undefined) {
  return file
    ? {
        buffer: file.buffer,
        mimetype: file.mimetype,
        originalname: file.originalname,
        size: file.size,
      }
    : undefined;
}
