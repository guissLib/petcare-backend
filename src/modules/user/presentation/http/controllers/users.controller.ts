import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersApplicationService } from '../../../application/users.application.service';
import type { Input } from '../../../../shared-kernel/application/shared/application.utils';
import { Public } from '../auth/public.decorator';
import { CreateUserDto } from '../dtos/user.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersApplicationService) {}

  @Post()
  @Public()
  @ApiOperation({
    summary: 'Crea un usuario según su rol, sin autenticación',
    description:
      'Roles: pet-owner, provider y administrator. El rol provider también crea su perfil de proveedor.',
  })
  @ApiBody({ type: CreateUserDto })
  create(@Body() body: Input) {
    return this.users.create(body);
  }

  @Get()
  @ApiOperation({ summary: 'Lista los usuarios registrados' })
  list() {
    return this.users.list();
  }
}
