import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProviderRegistrationDto {
  @ApiProperty({ enum: ['employee', 'contractor', 'franchise'] })
  type!: 'employee' | 'contractor' | 'franchise';

  @ApiProperty({ example: 'Calle 100 # 12-30' })
  address!: string;

  @ApiProperty({
    enum: ['grooming', 'walking', 'boarding', 'veterinary', 'home-visit'],
    isArray: true,
  })
  services!: string[];

  @ApiPropertyOptional({ example: 8, default: 1 })
  capacity?: number;

  @ApiPropertyOptional({ default: false })
  acceptsHomeVisits?: boolean;

  @ApiPropertyOptional({ example: 4.676 })
  latitude?: number;

  @ApiPropertyOptional({ example: -74.048 })
  longitude?: number;
}

export class CreateUserDto {
  @ApiProperty({ example: 'Ana Pérez' })
  name!: string;

  @ApiProperty({ format: 'email', example: 'ana@example.com' })
  email!: string;

  @ApiProperty({
    writeOnly: true,
    minLength: 12,
    example: 'UnaClaveSegura2026!',
  })
  password!: string;

  @ApiPropertyOptional({ enum: ['pet-owner', 'provider', 'administrator'] })
  role?: 'pet-owner' | 'provider' | 'administrator';

  @ApiPropertyOptional({ example: '+57 300 123 4567' })
  phone?: string;

  @ApiPropertyOptional({ example: 'Bogotá' })
  city?: string;

  @ApiPropertyOptional({
    type: () => ProviderRegistrationDto,
    description: 'Requerido cuando role=provider.',
  })
  provider?: ProviderRegistrationDto;
}
