import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PAYMENT_EVENT_CONSUMER } from '../../shared-kernel/application/ports/payment-event-bus.port';
import type {
  PaymentConfirmedMessage,
  PaymentEventConsumer,
} from '../../shared-kernel/application/ports/payment-event-bus.port';
import { BookingsApplicationService } from './bookings.application.service';

@Injectable()
export class PaymentConfirmedConsumer implements OnModuleInit {
  private readonly logger = new Logger(PaymentConfirmedConsumer.name);

  constructor(
    @Inject(PAYMENT_EVENT_CONSUMER)
    private readonly events: PaymentEventConsumer,
    private readonly bookings: BookingsApplicationService,
  ) {}

  onModuleInit() {
    this.events.registerPaymentConfirmedHandler((message) =>
      this.handle(message),
    );
  }

  private async handle(message: PaymentConfirmedMessage) {
    this.logger.log(
      `Recibido payment.confirmed eventId=${message.eventId} paymentId=${message.paymentId} bookingId=${message.bookingId}`,
    );
    await this.bookings.confirmFromPaymentEvent(message);
    this.logger.log(
      `Reserva confirmada desde payment.confirmed bookingId=${message.bookingId}`,
    );
  }
}
