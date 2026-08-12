import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  createId,
  now,
} from '../../shared-kernel/application/shared/application.utils';
import { SAGA_MESSAGE_BUS } from '../../shared-kernel/application/ports/saga-message-bus.port';
import type {
  SagaMessage,
  SagaMessageBus,
} from '../../shared-kernel/application/ports/saga-message-bus.port';
import { NotificationsApplicationService } from './notifications.application.service';

const NOTIFICATION_QUEUE =
  process.env.RABBITMQ_NOTIFICATION_QUEUE?.trim() ||
  'petcare.notification.confirmation-command.v2';

@Injectable()
export class NotificationSagaConsumer implements OnModuleInit {
  private readonly logger = new Logger(NotificationSagaConsumer.name);

  constructor(
    @Inject(SAGA_MESSAGE_BUS)
    private readonly messages: SagaMessageBus,
    private readonly notifications: NotificationsApplicationService,
  ) {}

  onModuleInit() {
    this.messages.register(
      NOTIFICATION_QUEUE,
      'notification.send-booking-confirmed',
      (message) => this.send(message),
    );
  }

  private async send(message: SagaMessage) {
    this.logger.log(
      `Recibido notification.send-booking-confirmed sagaId=${message.sagaId} bookingId=${message.bookingId}`,
    );
    try {
      await this.notifications.sendBookingConfirmation({
        bookingId: requiredText(message.bookingId, 'bookingId'),
        userId: requiredText(message.userId, 'userId'),
        providerId: requiredText(message.providerId, 'providerId'),
      });
      await this.messages.publish({
        ...message,
        eventId: createId('notification-event'),
        eventName: 'notification.sent',
        occurredAt: now(),
      });
    } catch (error) {
      await this.messages.publish({
        ...message,
        eventId: createId('notification-failure'),
        eventName: 'notification.failed',
        occurredAt: now(),
        reason: errorMessage(error),
        attempt: typeof message.attempt === 'number' ? message.attempt : 1,
      });
    }
  }
}

function requiredText(value: unknown, field: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Mensaje Saga sin ${field}`);
  }
  return value.trim();
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
