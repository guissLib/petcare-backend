import { Inject, Injectable } from '@nestjs/common';
import {
  AccessDeniedError,
  EntityNotFoundError,
} from '../../shared-kernel/domain/shared/errors/domain-error';
import { NOTIFICATION_REPOSITORY } from '../domain/repositories/notification.repository';
import type { NotificationRepository } from '../domain/repositories/notification.repository';
import { USER_REPOSITORY } from '../../user/domain/repositories/user.repository';
import type { UserRepository } from '../../user/domain/repositories/user.repository';

@Injectable()
export class NotificationsApplicationService {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: NotificationRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
  ) {}

  async listByUser(
    userId: string,
    actor?: { id: string; role: 'pet-owner' | 'provider' | 'administrator' },
  ) {
    if (actor && actor.role !== 'administrator' && actor.id !== userId) {
      throw new AccessDeniedError(
        'No puede consultar notificaciones de otro usuario',
      );
    }
    const user = await this.users.findById(userId);
    if (!user) {
      throw new EntityNotFoundError('Usuario no encontrado');
    }
    const notifications = await this.notifications.findByUserId(userId);
    return notifications.map((notification) => notification.toPrimitives());
  }
}
