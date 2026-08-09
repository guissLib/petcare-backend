import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SAGA_MESSAGE_BUS } from '../../shared-kernel/application/ports/saga-message-bus.port';
import type {
  SagaMessage,
  SagaMessageBus,
} from '../../shared-kernel/application/ports/saga-message-bus.port';
import {
  createId,
  now,
} from '../../shared-kernel/application/shared/application.utils';
import { BookingsApplicationService } from './bookings.application.service';

const BOOKING_CONFIRM_QUEUE = 'petcare.booking.confirm-command';
const BOOKING_CANCEL_QUEUE = 'petcare.booking.cancel-command';

@Injectable()
export class BookingSagaConsumer implements OnModuleInit {
  private readonly logger = new Logger(BookingSagaConsumer.name);

  constructor(
    @Inject(SAGA_MESSAGE_BUS)
    private readonly messages: SagaMessageBus,
    private readonly bookings: BookingsApplicationService,
  ) {}

  onModuleInit() {
    this.messages.register(
      BOOKING_CONFIRM_QUEUE,
      'booking.confirm',
      (message) => this.confirm(message),
    );
    this.messages.register(BOOKING_CANCEL_QUEUE, 'booking.cancel', (message) =>
      this.cancel(message),
    );
  }

  private async confirm(message: SagaMessage) {
    this.logger.log(
      `Recibido booking.confirm sagaId=${message.sagaId} bookingId=${message.bookingId}`,
    );
    try {
      await this.bookings.confirmFromPaymentCommand(message);
      await this.messages.publish({
        ...message,
        eventId: createId('booking-event'),
        eventName: 'booking.confirmed',
        occurredAt: now(),
      });
      this.logger.log(
        `Publicado booking.confirmed sagaId=${message.sagaId} bookingId=${message.bookingId}`,
      );
    } catch (error) {
      await this.messages.publish({
        ...message,
        eventId: createId('booking-failure'),
        eventName: 'booking.confirmation.failed',
        occurredAt: now(),
        reason: errorMessage(error),
      });
      this.logger.warn(
        `Publicado booking.confirmation.failed sagaId=${message.sagaId} bookingId=${message.bookingId}`,
      );
    }
  }

  private async cancel(message: SagaMessage) {
    this.logger.log(
      `Recibido booking.cancel sagaId=${message.sagaId} bookingId=${message.bookingId}`,
    );
    try {
      const booking = await this.bookings.cancelFromSaga(
        message.bookingId,
        message.reason,
      );
      if (booking.status !== 'cancelled') {
        throw new Error('La reserva ya no puede ser compensada');
      }
      await this.messages.publish({
        ...message,
        eventId: createId('booking-event'),
        eventName: 'booking.cancelled',
        occurredAt: now(),
      });
      this.logger.log(
        `Publicado booking.cancelled sagaId=${message.sagaId} bookingId=${message.bookingId}`,
      );
    } catch (error) {
      await this.messages.publish({
        ...message,
        eventId: createId('booking-cancellation-failure'),
        eventName: 'booking.cancellation.failed',
        occurredAt: now(),
        reason: errorMessage(error),
      });
      this.logger.warn(
        `Publicado booking.cancellation.failed sagaId=${message.sagaId} bookingId=${message.bookingId}`,
      );
    }
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
