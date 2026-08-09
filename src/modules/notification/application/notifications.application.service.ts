import { Inject, Injectable } from '@nestjs/common';
import {
  AccessDeniedError,
  EntityNotFoundError,
} from '../../shared-kernel/domain/shared/errors/domain-error';
import { NOTIFICATION_REPOSITORY } from '../domain/repositories/notification.repository';
import type { NotificationRepository } from '../domain/repositories/notification.repository';
import { USER_REPOSITORY } from '../../user/domain/repositories/user.repository';
import type { UserRepository } from '../../user/domain/repositories/user.repository';
import { PROVIDER_REPOSITORY } from '../../provider/domain/repositories/provider.repository';
import type { ProviderRepository } from '../../provider/domain/repositories/provider.repository';
import { Notification } from '../domain/entities/notification.entity';
import {
  createId,
  now,
} from '../../shared-kernel/application/shared/application.utils';

@Injectable()
export class NotificationsApplicationService {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: NotificationRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
    @Inject(PROVIDER_REPOSITORY)
    private readonly providers: ProviderRepository,
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

  async sendBookingConfirmation(input: {
    bookingId: string;
    userId: string;
    providerId: string;
  }) {
    await this.saveConfirmation(
      input.userId,
      input.bookingId,
      `Reserva ${input.bookingId} confirmada`,
    );
    const provider = await this.providers.findById(input.providerId);
    const operatorUserId = provider?.toPrimitives().operatorUserId;
    if (operatorUserId) {
      await this.saveConfirmation(
        operatorUserId,
        input.bookingId,
        `Nueva reserva pagada ${input.bookingId}`,
      );
    }
  }

  private async saveConfirmation(
    userId: string,
    bookingId: string,
    message: string,
  ) {
    if (
      await this.notifications.findByUserBookingAndType(
        userId,
        bookingId,
        'confirmation',
      )
    ) {
      return;
    }
    await this.notifications.save(
      Notification.create({
        id: createId('notification'),
        userId,
        bookingId,
        type: 'confirmation',
        message,
        sentAt: now(),
      }),
    );
  }
}
