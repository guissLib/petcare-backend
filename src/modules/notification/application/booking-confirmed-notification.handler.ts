import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { EVENT_BUS } from '../../shared-kernel/application/ports/event-bus.port';
import type { EventBus } from '../../shared-kernel/application/ports/event-bus.port';
import type { BookingConfirmedDomainEvent } from '../../booking/domain/events/booking-confirmed.domain-event';
import { NOTIFICATION_REPOSITORY } from '../domain/repositories/notification.repository';
import type { NotificationRepository } from '../domain/repositories/notification.repository';
import { PROVIDER_REPOSITORY } from '../../provider/domain/repositories/provider.repository';
import type { ProviderRepository } from '../../provider/domain/repositories/provider.repository';
import { Notification } from '../domain/entities/notification.entity';
import {
  createId,
  now,
} from '../../shared-kernel/application/shared/application.utils';
import type { DomainEvent } from '../../shared-kernel/domain/events/domain-event';

@Injectable()
export class BookingConfirmedNotificationHandler implements OnModuleInit {
  constructor(
    @Inject(EVENT_BUS)
    private readonly eventBus: EventBus,
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: NotificationRepository,
    @Inject(PROVIDER_REPOSITORY)
    private readonly providers: ProviderRepository,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('booking.confirmed', (event) => this.handle(event));
  }

  private async handle(event: DomainEvent) {
    const confirmation = event as BookingConfirmedDomainEvent;
    await this.saveOnce(
      confirmation.userId,
      confirmation.aggregateId,
      `Reserva ${confirmation.aggregateId} confirmada`,
    );
    const provider = await this.providers.findById(confirmation.providerId);
    const operatorUserId = provider?.toPrimitives().operatorUserId;
    if (operatorUserId) {
      await this.saveOnce(
        operatorUserId,
        confirmation.aggregateId,
        `Nueva reserva pagada ${confirmation.aggregateId}`,
      );
    }
  }

  private async saveOnce(userId: string, bookingId: string, message: string) {
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
