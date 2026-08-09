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
import { PaymentsApplicationService } from './payments.application.service';

const PAYMENT_REFUND_QUEUE = 'petcare.payment.refund-command';

@Injectable()
export class PaymentSagaConsumer implements OnModuleInit {
  private readonly logger = new Logger(PaymentSagaConsumer.name);

  constructor(
    @Inject(SAGA_MESSAGE_BUS)
    private readonly messages: SagaMessageBus,
    private readonly payments: PaymentsApplicationService,
  ) {}

  onModuleInit() {
    this.messages.register(PAYMENT_REFUND_QUEUE, 'payment.refund', (message) =>
      this.refund(message),
    );
  }

  private async refund(message: SagaMessage) {
    this.logger.log(
      `Recibido payment.refund sagaId=${message.sagaId} paymentId=${message.paymentId}`,
    );
    try {
      const payment = await this.payments.refund(
        requiredText(message.paymentId, 'paymentId'),
      );
      const data = payment.toPrimitives();
      await this.messages.publish({
        ...message,
        eventId: createId('payment-event'),
        eventName: 'payment.refunded',
        occurredAt: now(),
        amount: data.amount,
        currency: data.currency,
      });
      this.logger.log(
        `Publicado payment.refunded sagaId=${message.sagaId} paymentId=${data.id}`,
      );
    } catch (error) {
      await this.messages.publish({
        ...message,
        eventId: createId('payment-refund-failure'),
        eventName: 'payment.refund.failed',
        occurredAt: now(),
        reason: errorMessage(error),
      });
      this.logger.warn(
        `Publicado payment.refund.failed sagaId=${message.sagaId} paymentId=${message.paymentId}`,
      );
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
