import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePromotionDto {
  @ApiProperty({ example: 'Bienvenida PetCare' })
  name!: string;

  @ApiProperty({ example: 'Descuento para nuevos clientes' })
  description!: string;

  @ApiProperty({ example: 10, minimum: 0, maximum: 100 })
  discountPercent!: number;

  @ApiProperty({ enum: ['national', 'local'] })
  scope!: 'national' | 'local';

  @ApiProperty({ example: '2026-01-01' })
  startsAt!: string;

  @ApiProperty({ example: '2026-12-31' })
  endsAt!: string;

  @ApiPropertyOptional({ example: 'Bogotá' })
  city?: string;

  @ApiPropertyOptional({ example: 'provider_centro' })
  providerId?: string;

  @ApiPropertyOptional({
    enum: ['grooming', 'walking', 'boarding', 'veterinary', 'home-visit'],
    isArray: true,
  })
  serviceTypes?: string[];

  @ApiPropertyOptional({ default: true })
  active?: boolean;
}
