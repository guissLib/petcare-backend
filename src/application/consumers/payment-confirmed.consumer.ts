import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PETCARE_EVENT_BUS } from '../ports/event-bus.port';
import type { PetcareEventBus } from '../ports/event-bus.port';
import { BookingsDomainService } from '../../domains/bookings/bookings.domain.service';

@Injectable()
export class PaymentConfirmedConsumer implements OnModuleInit {
  private readonly logger = new Logger(PaymentConfirmedConsumer.name);

  constructor(
    @Inject(PETCARE_EVENT_BUS)
    private readonly eventBus: PetcareEventBus,
    private readonly bookings: BookingsDomainService,
  ) {}

  async onModuleInit() {
    await this.eventBus.subscribe('payment.confirmed', async (event) => {
      this.logger.log(
        `[BOOKING_EVENT_RECEIVED] eventId=${event.eventId} ` +
          `paymentId=${event.payment.id} userId=${event.booking.userId}`,
      );
      try {
        const booking = this.bookings.createFromPayment(event);
        this.logger.log(
          `[BOOKING_EVENT_PROCESSED] eventId=${event.eventId} ` +
            `paymentId=${event.payment.id} bookingId=${booking.id}`,
        );
        await Promise.resolve();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `[BOOKING_EVENT_FAILED] eventId=${event.eventId} ` +
            `paymentId=${event.payment.id} error=${message}`,
        );
        throw error;
      }
    });
    this.logger.log('[BOOKING_CONSUMER_READY] event=payment.confirmed');
  }
}
