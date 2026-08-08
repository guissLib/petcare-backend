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
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { PromotionsApplicationService } from '../../../application/promotions.application.service';
import type { Input } from '../../../../shared-kernel/application/shared/application.utils';
import { CreatePromotionDto } from '../dtos/promotion.dto';
import type { Request } from 'express';
import { getAuthenticatedActor } from '../../../../user/infrastructure/security/jwt-auth.guard';

@ApiTags('Promotions')
@ApiBearerAuth()
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotions: PromotionsApplicationService) {}

  @Get()
  @ApiOperation({ summary: 'Lista promociones activas' })
  @ApiQuery({ name: 'city', required: false, example: 'Bogotá' })
  @ApiQuery({ name: 'providerId', required: false, example: 'provider_centro' })
  list(@Query() query: Input, @Req() request: Request) {
    return this.promotions.list(query, getAuthenticatedActor(request));
  }

  @Get('mine')
  @ApiOperation({ summary: 'Lista las promociones del proveedor autenticado' })
  mine(@Req() request: Request) {
    return this.promotions.listOwn(getAuthenticatedActor(request));
  }

  @Post()
  @ApiOperation({ summary: 'Crea una promoción nacional o local' })
  @ApiBody({ type: CreatePromotionDto })
  create(@Body() body: Input, @Req() request: Request) {
    return this.promotions.create(body, getAuthenticatedActor(request));
  }

  @Patch(':promotionId')
  @ApiOperation({ summary: 'Actualiza una promoción propia' })
  @ApiParam({ name: 'promotionId', example: 'promo_123' })
  update(
    @Param('promotionId') promotionId: string,
    @Body() body: Input,
    @Req() request: Request,
  ) {
    return this.promotions.update(
      promotionId,
      body,
      getAuthenticatedActor(request),
    );
  }

  @Patch(':promotionId/status')
  @ApiOperation({ summary: 'Activa o desactiva una promoción propia' })
  @ApiParam({ name: 'promotionId', example: 'promo_123' })
  setActive(
    @Param('promotionId') promotionId: string,
    @Body('active') active: boolean,
    @Req() request: Request,
  ) {
    return this.promotions.setActive(
      promotionId,
      active,
      getAuthenticatedActor(request),
    );
  }
}
