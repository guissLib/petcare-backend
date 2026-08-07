import { Inject, Injectable } from '@nestjs/common';
import { EntityNotFoundError } from '../domain/shared/errors/domain-error';
import { NOTIFICATION_REPOSITORY } from '../domain/repositories/notification.repository';
import type { NotificationRepository } from '../domain/repositories/notification.repository';
import { USER_REPOSITORY } from '../domain/repositories/user.repository';
import type { UserRepository } from '../domain/repositories/user.repository';

@Injectable()
export class NotificationsApplicationService {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: NotificationRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
  ) {}

  async listByUser(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new EntityNotFoundError('Usuario no encontrado');
    }
    const notifications = await this.notifications.findByUserId(userId);
    return notifications.map((notification) => notification.toPrimitives());
  }
}
