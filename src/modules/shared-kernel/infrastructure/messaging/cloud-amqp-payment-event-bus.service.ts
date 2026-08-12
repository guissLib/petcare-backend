import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import amqp, {
  type Channel,
  type ChannelModel,
  type ConfirmChannel,
  type ConsumeMessage,
} from 'amqplib';
import type {
  PaymentConfirmedMessage,
  PaymentEventPublisher,
} from '../../application/ports/payment-event-bus.port';
import type {
  SagaMessage,
  SagaMessageBus,
  SagaMessageHandler,
  SagaMessageName,
} from '../../application/ports/saga-message-bus.port';
import { RetryableSagaError } from '../../application/ports/saga-message-bus.port';

interface Registration {
  queue: string;
  routingKeys: SagaMessageName[];
  handler: SagaMessageHandler;
  started: boolean;
}

@Injectable()
export class CloudAmqpPaymentEventBus
  implements
    PaymentEventPublisher,
    SagaMessageBus,
    OnModuleInit,
    OnModuleDestroy
{
  private readonly logger = new Logger(CloudAmqpPaymentEventBus.name);
  private readonly url =
    process.env.CLOUDAMQP_URL?.trim() || process.env.RABBITMQ_URL?.trim() || '';
  private readonly exchange =
    process.env.RABBITMQ_EXCHANGE?.trim() ||
    process.env.AMQP_EXCHANGE?.trim() ||
    'petcare.events';
  private readonly deadLetterExchange =
    process.env.RABBITMQ_DEAD_LETTER_EXCHANGE?.trim() || 'petcare.events.dead';
  private readonly registrations = new Map<string, Registration>();

  private connection?: ChannelModel;
  private channel?: ConfirmChannel;
  private connecting?: Promise<void>;
  private reconnectTimer?: NodeJS.Timeout;
  private shuttingDown = false;

  async onModuleInit() {
    if (!this.url) {
      this.logger.warn(
        'RabbitMQ no configurado; el transporte Saga no estará disponible',
      );
      return;
    }
    try {
      await this.connect();
    } catch {
      this.logger.warn(
        'La aplicación inició sin RabbitMQ; las transacciones Saga quedarán pendientes',
      );
    }
    this.reconnectTimer = setInterval(() => {
      if (!this.connection && !this.shuttingDown) {
        void this.connect().catch(() => undefined);
      }
    }, 5000);
  }

  async publishPaymentConfirmed(message: PaymentConfirmedMessage) {
    await this.publishJson(message.eventId, message.eventName, message);
  }

  async publish(message: SagaMessage) {
    await this.publishJson(message.eventId, message.eventName, message);
  }

  register(
    queue: string,
    routingKey: SagaMessageName | SagaMessageName[],
    handler: SagaMessageHandler,
  ) {
    const registration: Registration = {
      queue,
      routingKeys: Array.isArray(routingKey) ? routingKey : [routingKey],
      handler,
      started: false,
    };
    this.registrations.set(queue, registration);
    void this.startRegistration(registration).catch((error) => {
      this.logger.error(
        `No se pudo iniciar consumidor queue=${queue}: ${errorMessage(error)}`,
      );
    });
  }

  async onModuleDestroy() {
    this.shuttingDown = true;
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer);
    }
    try {
      await this.channel?.close();
    } catch {
      // The broker may already have closed the channel.
    }
    try {
      await this.connection?.close();
    } catch {
      // The broker may already have closed the connection.
    }
    this.channel = undefined;
    this.connection = undefined;
  }

  private async publishJson(
    eventId: string,
    eventName: string,
    payload: object,
  ) {
    if (!this.url) {
      this.publishLocally({
        eventId,
        eventName: eventName as SagaMessageName,
        occurredAt:
          'occurredAt' in payload && typeof payload.occurredAt === 'string'
            ? payload.occurredAt
            : new Date().toISOString(),
        ...payload,
      });
      return;
    }
    await this.connect();
    if (!this.channel) {
      throw new Error('RabbitMQ no está disponible para publicar el mensaje');
    }
    const published = this.channel.publish(
      this.exchange,
      eventName,
      Buffer.from(JSON.stringify(payload)),
      {
        contentType: 'application/json',
        deliveryMode: 2,
        persistent: true,
        messageId: eventId,
        type: eventName,
      },
    );
    if (!published) {
      await waitForDrain(this.channel);
    }
    await this.channel.waitForConfirms();
    this.logger.log(`Publicado ${eventName} eventId=${eventId}`);
  }

  private async connect() {
    if (!this.url || this.connection) {
      return;
    }
    if (this.connecting) {
      return this.connecting;
    }
    this.connecting = this.openConnection().finally(() => {
      this.connecting = undefined;
    });
    return this.connecting;
  }

  private async openConnection() {
    try {
      const connection = await amqp.connect(this.url);
      this.connection = connection;
      connection.on('error', (error) => {
        this.logger.error(`RabbitMQ connection error: ${error.message}`);
      });
      connection.on('close', () => {
        this.channel = undefined;
        this.connection = undefined;
        for (const registration of this.registrations.values()) {
          registration.started = false;
        }
        if (!this.shuttingDown) {
          this.logger.warn('RabbitMQ connection closed');
        }
      });
      const channel = await connection.createConfirmChannel();
      this.channel = channel;
      await this.configureInfrastructure(channel);
      for (const registration of this.registrations.values()) {
        await this.startRegistration(registration);
      }
      this.logger.log(`RabbitMQ conectado; exchange=${this.exchange}`);
    } catch (error) {
      this.channel = undefined;
      this.connection = undefined;
      this.logger.error(
        `No se pudo conectar a RabbitMQ: ${errorMessage(error)}`,
      );
      throw error;
    }
  }

  private async configureInfrastructure(channel: Channel) {
    await channel.assertExchange(this.exchange, 'topic', { durable: true });
    await channel.assertExchange(this.deadLetterExchange, 'topic', {
      durable: true,
    });
  }

  private async startRegistration(registration: Registration) {
    if (!this.channel || registration.started) {
      return;
    }
    const channel = this.channel;
    const deadLetterQueue = `${registration.queue}.dlq`;
    await channel.assertQueue(deadLetterQueue, { durable: true });
    await channel.assertQueue(registration.queue, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': this.deadLetterExchange,
        'x-dead-letter-routing-key': registration.queue,
      },
    });
    await channel.bindQueue(
      deadLetterQueue,
      this.deadLetterExchange,
      registration.queue,
    );
    for (const routingKey of registration.routingKeys) {
      await channel.bindQueue(registration.queue, this.exchange, routingKey);
    }
    await channel.consume(
      registration.queue,
      (message) => void this.handleMessage(channel, registration, message),
      { noAck: false },
    );
    registration.started = true;
    this.logger.log(
      `RabbitMQ consumidor activo queue=${registration.queue} routingKeys=${registration.routingKeys.join(',')}`,
    );
  }

  private async handleMessage(
    channel: Channel,
    registration: Registration,
    message: ConsumeMessage | null,
  ) {
    if (!message) {
      return;
    }
    try {
      const parsed = JSON.parse(
        message.content.toString('utf8'),
      ) as SagaMessage;
      validateMessage(parsed);
      await registration.handler(parsed);
      channel.ack(message);
    } catch (error) {
      this.logger.error(
        `Mensaje ${message.fields.routingKey} rechazado: ${errorMessage(error)}`,
      );
      channel.nack(message, false, error instanceof RetryableSagaError);
    }
  }

  private publishLocally(message: SagaMessage) {
    const registrations = [...this.registrations.values()].filter(
      (registration) => registration.routingKeys.includes(message.eventName),
    );
    if (registrations.length === 0) {
      this.logger.warn(
        `Mensaje local sin consumidor eventName=${message.eventName}`,
      );
      return;
    }
    for (const registration of registrations) {
      setImmediate(() => {
        void registration.handler(message).catch((error) => {
          this.logger.error(
            `Error procesando mensaje local ${message.eventName}: ${errorMessage(error)}`,
          );
        });
      });
    }
  }
}

function validateMessage(message: SagaMessage) {
  if (!message.eventId || !message.eventName || !message.occurredAt) {
    throw new Error('Mensaje Saga inválido');
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function waitForDrain(channel: Channel) {
  return new Promise<void>((resolve) => {
    channel.once('drain', resolve);
  });
}
