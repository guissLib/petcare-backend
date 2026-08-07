import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { NotificationsApplicationService } from '../../../application/notifications.application.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('users')
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsApplicationService,
  ) {}

  @Get(':userId/notifications')
  @ApiOperation({ summary: 'Lista las notificaciones de un usuario' })
  @ApiParam({ name: 'userId', example: 'user_123' })
  list(@Param('userId') userId: string) {
    return this.notifications.listByUser(userId);
  }
}
