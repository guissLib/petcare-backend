import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ example: 'pet_123' })
  petId!: string;

  @ApiProperty({ example: 'provider_centro' })
  providerId!: string;

  @ApiProperty({
    enum: [
      'grooming',
      'walking',
      'boarding',
      'veterinary',
      'home-visit',
      'cleaning',
    ],
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

  @ApiPropertyOptional({
    example: 'payment_123',
    description:
      'Pago ya aprobado para compatibilidad; el checkout crea el pago pendiente automáticamente.',
  })
  paymentId?: string;

  @ApiPropertyOptional({
    example: 'checkout_8f8f6d2e',
    description: 'Clave única para reintentar sin duplicar la reserva.',
  })
  idempotencyKey?: string;

  @ApiPropertyOptional({ example: 'Carrera 10 # 20-30, Bogotá' })
  address?: string;

  @ApiPropertyOptional({ example: -16.4897 })
  latitude?: number;

  @ApiPropertyOptional({ example: -68.1193 })
  longitude?: number;

  @ApiPropertyOptional({ example: 'Casa de portón negro' })
  addressReference?: string;

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
