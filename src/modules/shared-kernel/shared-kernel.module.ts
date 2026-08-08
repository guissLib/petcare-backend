import { Module } from '@nestjs/common';
import { EVENT_BUS } from './application/ports/event-bus.port';
import {
  PAYMENT_EVENT_CONSUMER,
  PAYMENT_EVENT_PUBLISHER,
} from './application/ports/payment-event-bus.port';
import { LocalEventBus } from './infrastructure/events/local-event-bus.service';
import { CloudAmqpPaymentEventBus } from './infrastructure/messaging/cloud-amqp-payment-event-bus.service';

@Module({
  providers: [
    LocalEventBus,
    CloudAmqpPaymentEventBus,
    {
      provide: EVENT_BUS,
      useExisting: LocalEventBus,
    },
    {
      provide: PAYMENT_EVENT_PUBLISHER,
      useExisting: CloudAmqpPaymentEventBus,
    },
    {
      provide: PAYMENT_EVENT_CONSUMER,
      useExisting: CloudAmqpPaymentEventBus,
    },
  ],
  exports: [EVENT_BUS, PAYMENT_EVENT_PUBLISHER, PAYMENT_EVENT_CONSUMER],
})
export class SharedKernelModule {}
