import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ format: 'email', example: 'ana@example.com' })
  email!: string;

  @ApiProperty({
    writeOnly: true,
    minLength: 12,
    example: 'UnaClaveSegura2026!',
  })
  password!: string;
}
