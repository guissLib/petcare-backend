import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({ example: 50000 })
  amount!: number;

  @ApiProperty({ enum: ['online', 'at-location'] })
  method!: 'online' | 'at-location';
}
