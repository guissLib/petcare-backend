import { ApiProperty } from '@nestjs/swagger';

export class GeocodeDto {
  @ApiProperty({ example: 'Calle 100 # 12-30' })
  address!: string;

  @ApiProperty({ example: 'Bogotá' })
  city!: string;
}
