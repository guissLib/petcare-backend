import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ example: 'pet_123' })
  petId!: string;

  @ApiProperty({ example: 'provider_centro' })
  providerId!: string;

  @ApiProperty({
    enum: ['grooming', 'walking', 'boarding', 'veterinary', 'home-visit'],
  })
  serviceType!: string;

  @ApiProperty({
    enum: ['pickup-dropoff', 'home-visit', 'at-location'],
  })
  visitMode!: string;

  @ApiProperty({ example: '2026-09-15T10:00:00.000Z' })
  scheduledAt!: string;

  @ApiProperty({ enum: ['online', 'at-location'] })
  paymentMethod!: 'online' | 'at-location';

  @ApiPropertyOptional({ example: 50000 })
  total?: number;

  @ApiPropertyOptional({ example: 'payment_123' })
  paymentId?: string;

  @ApiPropertyOptional({ example: 'Carrera 10 # 20-30, Bogotá' })
  address?: string;

  @ApiPropertyOptional({ example: 'Tiene miedo a las agujas' })
  notes?: string;
}

export class UpdateBookingStatusDto {
  @ApiProperty({
    enum: [
      'pending',
      'confirmed',
      'rejected',
      'in-progress',
      'completed',
      'cancelled',
    ],
  })
  status!: string;

  @ApiPropertyOptional({ example: 'No presentó la vacuna requerida' })
  reason?: string;
}
