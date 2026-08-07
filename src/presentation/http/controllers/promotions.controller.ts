import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { PromotionsApplicationService } from '../../../application/promotions.application.service';
import type { Input } from '../../../application/shared/application.utils';
import { CreatePromotionDto } from '../dtos/promotion.dto';

@ApiTags('Promotions')
@ApiBearerAuth()
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotions: PromotionsApplicationService) {}

  @Get()
  @ApiOperation({ summary: 'Lista promociones activas' })
  @ApiQuery({ name: 'city', required: false, example: 'Bogotá' })
  @ApiQuery({ name: 'providerId', required: false, example: 'provider_centro' })
  list(@Query() query: Input) {
    return this.promotions.list(query);
  }

  @Post()
  @ApiOperation({ summary: 'Crea una promoción nacional o local' })
  @ApiBody({ type: CreatePromotionDto })
  create(@Body() body: Input) {
    return this.promotions.create(body);
  }
}
