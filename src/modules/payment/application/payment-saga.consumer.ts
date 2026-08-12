import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SAGA_MESSAGE_BUS } from '../../shared-kernel/application/ports/saga-message-bus.port';
import { RetryableSagaError } from '../../shared-kernel/application/ports/saga-message-bus.port';
import type {
  SagaMessage,
  SagaMessageBus,
} from '../../shared-kernel/application/ports/saga-message-bus.port';
import { PaymentCommandService } from './payment-command.service';

const PAYMENT_COMMAND_QUEUE = 'petcare.payment.commands';
const PAYMENT_COMMANDS = [
  'payment.intent.create',
  'payment.capture-token',
  'payment.confirm-at-location',
  'payment.refund',
] as const;

@Injectable()
export class PaymentSagaConsumer implements OnModuleInit {
  private readonly logger = new Logger(PaymentSagaConsumer.name);

  constructor(
    @Inject(SAGA_MESSAGE_BUS)
    private readonly messages: SagaMessageBus,
    private readonly commands: PaymentCommandService,
  ) {}

  onModuleInit() {
    this.messages.register(
      PAYMENT_COMMAND_QUEUE,
      [...PAYMENT_COMMANDS],
      (message) => this.process(message),
    );
  }

  private async process(message: SagaMessage) {
    this.logger.log(
      `Recibido ${message.eventName} sagaId=${message.sagaId} paymentId=${message.paymentId}`,
    );
    try {
      await this.commands.process(message);
    } catch (error) {
      throw new RetryableSagaError(
        `Fallo técnico procesando ${message.eventName}: ${errorMessage(error)}`,
        { cause: error },
      );
    }
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
