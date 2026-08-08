import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePromotionDto {
  @ApiProperty({ example: 'Bienvenida PetCare' })
  name!: string;

  @ApiProperty({ example: 'Descuento para nuevos clientes' })
  description!: string;

  @ApiProperty({ enum: ['percent', 'fixed'] })
  discountType!: 'percent' | 'fixed';

  @ApiProperty({ example: 10, minimum: 0 })
  discountValue!: number;

  @ApiProperty({
    enum: ['national', 'local'],
    description:
      'national aplica en cualquier ciudad; local requiere city y coincide con la ciudad del cliente',
  })
  scope!: 'national' | 'local';

  @ApiProperty({ example: '2026-01-01' })
  startsAt!: string;

  @ApiProperty({ example: '2026-12-31' })
  endsAt!: string;

  @ApiPropertyOptional({
    example: 'Bogotá',
    description: 'Obligatoria cuando scope es local.',
  })
  city?: string;

  @ApiPropertyOptional({ example: 'provider_centro' })
  providerId?: string;

  @ApiPropertyOptional({
    enum: [
      'grooming',
      'walking',
      'boarding',
      'veterinary',
      'home-visit',
      'cleaning',
    ],
    isArray: true,
  })
  serviceTypes?: string[];

  @ApiPropertyOptional({ default: true })
  active?: boolean;
}
