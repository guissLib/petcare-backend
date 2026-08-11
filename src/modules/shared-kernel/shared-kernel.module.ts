import { Module } from '@nestjs/common';
import { EVENT_BUS } from './application/ports/event-bus.port';
import { PAYMENT_EVENT_PUBLISHER } from './application/ports/payment-event-bus.port';
import { SAGA_MESSAGE_BUS } from './application/ports/saga-message-bus.port';
import { LocalEventBus } from './infrastructure/events/local-event-bus.service';
import {
  BOOKING_AVAILABILITY_CLIENT,
  BookingAvailabilityHttpClient,
} from './infrastructure/integrations/booking-availability.client';
import { CloudAmqpPaymentEventBus } from './infrastructure/messaging/cloud-amqp-payment-event-bus.service';

@Module({
  providers: [
    LocalEventBus,
    CloudAmqpPaymentEventBus,
    BookingAvailabilityHttpClient,
    {
      provide: EVENT_BUS,
      useExisting: LocalEventBus,
    },
    {
      provide: PAYMENT_EVENT_PUBLISHER,
      useExisting: CloudAmqpPaymentEventBus,
    },
    {
      provide: SAGA_MESSAGE_BUS,
      useExisting: CloudAmqpPaymentEventBus,
    },
    {
      provide: BOOKING_AVAILABILITY_CLIENT,
      useExisting: BookingAvailabilityHttpClient,
    },
  ],
  exports: [
    EVENT_BUS,
    PAYMENT_EVENT_PUBLISHER,
    SAGA_MESSAGE_BUS,
    BOOKING_AVAILABILITY_CLIENT,
  ],
})
export class SharedKernelModule {}
