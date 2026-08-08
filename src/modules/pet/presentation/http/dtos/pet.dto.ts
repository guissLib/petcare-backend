import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePetDto {
  @ApiProperty({ example: 'Luna' })
  name!: string;

  @ApiProperty({ enum: ['dog', 'cat', 'bird', 'other'], example: 'dog' })
  species!: 'dog' | 'cat' | 'bird' | 'other';

  @ApiPropertyOptional({ example: 'Golden Retriever' })
  breed?: string;

  @ApiPropertyOptional({ example: 12.5 })
  weightKg?: number;

  @ApiPropertyOptional({ example: 'Se pone nerviosa con ruidos fuertes' })
  specialHandling?: string;
}

export class VaccinationDto {
  @ApiProperty({ example: 'Rabia' })
  vaccine!: string;

  @ApiProperty({ example: '2026-01-15' })
  administeredAt!: string;

  @ApiPropertyOptional({ example: '2027-01-15' })
  expiresAt?: string;

  @ApiPropertyOptional({ example: 'https://files.example/vaccine.pdf' })
  documentUrl?: string;
}
