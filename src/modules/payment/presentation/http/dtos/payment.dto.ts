import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({ example: 50000 })
  amount!: number;

  @ApiProperty({ enum: ['online', 'at-location'] })
  method!: 'online' | 'at-location';

  @ApiPropertyOptional({ example: 'Ana Pérez' })
  cardholderName?: string;

  @ApiPropertyOptional({ example: '4242424242424242' })
  cardNumber?: string;

  @ApiPropertyOptional({ example: 12 })
  expiryMonth?: number;

  @ApiPropertyOptional({ example: 2028 })
  expiryYear?: number;

  @ApiPropertyOptional({ example: '123' })
  cvv?: string;
}

export class MockCardPaymentDto {
  @ApiPropertyOptional({ example: 'Ana Pérez' })
  cardholderName?: string;

  @ApiPropertyOptional({ example: '4242424242424242' })
  cardNumber?: string;

  @ApiPropertyOptional({ example: 12 })
  expiryMonth?: number;

  @ApiPropertyOptional({ example: 2028 })
  expiryYear?: number;

  @ApiPropertyOptional({ example: '123' })
  cvv?: string;
}
