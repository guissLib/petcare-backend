import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthApplicationService } from '../../../application/auth.application.service';
import type { Input } from '../../../application/shared/application.utils';
import { LoginDto } from '../dtos/auth.dto';
import { Public } from '../auth/public.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthApplicationService) {}

  @Post('login')
  @Public()
  @ApiOperation({ summary: 'Inicia sesión con correo y contraseña' })
  @ApiBody({ type: LoginDto })
  login(@Body() body: Input) {
    return this.auth.login(body);
  }
}
