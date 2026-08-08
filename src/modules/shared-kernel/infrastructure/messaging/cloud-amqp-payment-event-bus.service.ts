import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import amqp, {
  type Channel,
  type ChannelModel,
  type ConsumeMessage,
  type ConfirmChannel,
} from 'amqplib';
import type {
  PaymentConfirmedHandler,
  PaymentConfirmedMessage,
  PaymentEventConsumer,
  PaymentEventPublisher,
} from '../../application/ports/payment-event-bus.port';

@Injectable()
export class CloudAmqpPaymentEventBus
  implements
    PaymentEventPublisher,
    PaymentEventConsumer,
    OnModuleInit,
    OnModuleDestroy
{
  private readonly logger = new Logger(CloudAmqpPaymentEventBus.name);
  private readonly url =
    process.env.CLOUDAMQP_URL?.trim() || process.env.RABBITMQ_URL?.trim() || '';
  private readonly exchange =
    process.env.RABBITMQ_EXCHANGE?.trim() || 'petcare.events';
  private readonly deadLetterExchange =
    process.env.RABBITMQ_DEAD_LETTER_EXCHANGE?.trim() || 'petcare.events.dead';
  private readonly queue =
    process.env.RABBITMQ_PAYMENT_CONFIRMED_QUEUE?.trim() ||
    'petcare.booking.payment-confirmed';
  private readonly deadLetterQueue =
    process.env.RABBITMQ_PAYMENT_CONFIRMED_DLQ?.trim() ||
    'petcare.booking.payment-confirmed.dlq';
  private readonly routingKey = 'payment.confirmed';

  private connection?: ChannelModel;
  private channel?: ConfirmChannel;
  private connecting?: Promise<void>;
  private handler?: PaymentConfirmedHandler;
  private consumerStarted = false;
  private shuttingDown = false;

  async onModuleInit() {
    if (!this.url) {
      this.logger.warn(
        'RabbitMQ no configurado; se usará entrega local solo para desarrollo',
      );
      return;
    }
    try {
      await this.connect();
    } catch {
      this.logger.warn(
        'La aplicación inició sin RabbitMQ; los pagos quedarán pendientes de confirmación hasta recuperar la conexión',
      );
    }
  }

  registerPaymentConfirmedHandler(handler: PaymentConfirmedHandler) {
    this.handler = handler;
    void this.startConsumerIfReady();
  }

  async publishPaymentConfirmed(message: PaymentConfirmedMessage) {
    if (!this.url) {
      this.publishLocally(message);
      return;
    }
    await this.connect();
    if (!this.channel) {
      throw new Error('RabbitMQ no está disponible para publicar el pago');
    }
    const published = this.channel.publish(
      this.exchange,
      this.routingKey,
      Buffer.from(JSON.stringify(message)),
      {
        contentType: 'application/json',
        deliveryMode: 2,
        messageId: message.eventId,
        type: message.eventName,
      },
    );
    if (!published) {
      await waitForDrain(this.channel);
    }
    await this.channel.waitForConfirms();
    this.logger.log(
      `Publicado payment.confirmed eventId=${message.eventId} paymentId=${message.paymentId} bookingId=${message.bookingId}`,
    );
  }

  async onModuleDestroy() {
    this.shuttingDown = true;
    try {
      await this.channel?.close();
    } catch {
      // The broker may already have closed the channel.
    }
    try {
      // amqplib exposes different close signatures across its Node typings.
      await this.connection?.close();
    } catch {
      // The broker may already have closed the connection.
    }
    this.channel = undefined;
    this.connection = undefined;
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
        this.consumerStarted = false;
        if (!this.shuttingDown) {
          this.logger.warn('RabbitMQ connection closed');
        }
      });
      const channel = await connection.createConfirmChannel();
      this.channel = channel;
      await this.configureTopology(channel);
      await this.startConsumerIfReady();
      this.logger.log(
        `RabbitMQ conectado; exchange=${this.exchange} queue=${this.queue}`,
      );
    } catch (error) {
      this.channel = undefined;
      this.connection = undefined;
      this.logger.error(
        `No se pudo conectar a RabbitMQ: ${errorMessage(error)}`,
      );
      throw error;
    }
  }

  private async configureTopology(channel: Channel) {
    await channel.assertExchange(this.exchange, 'topic', { durable: true });
    await channel.assertExchange(this.deadLetterExchange, 'topic', {
      durable: true,
    });
    await channel.assertQueue(this.deadLetterQueue, { durable: true });
    await channel.bindQueue(
      this.deadLetterQueue,
      this.deadLetterExchange,
      this.routingKey,
    );
    await channel.assertQueue(this.queue, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': this.deadLetterExchange,
        'x-dead-letter-routing-key': this.routingKey,
      },
    });
    await channel.bindQueue(this.queue, this.exchange, this.routingKey);
  }

  private async startConsumerIfReady() {
    if (!this.channel || !this.handler || this.consumerStarted) {
      return;
    }
    const channel = this.channel;
    this.consumerStarted = true;
    await channel.consume(
      this.queue,
      (message) => void this.handleMessage(channel, message),
      { noAck: false },
    );
    this.logger.log(`RabbitMQ consumidor activo; queue=${this.queue}`);
  }

  private async handleMessage(
    channel: Channel,
    message: ConsumeMessage | null,
  ) {
    if (!message || !this.handler) {
      return;
    }
    try {
      const parsed = JSON.parse(
        message.content.toString('utf8'),
      ) as PaymentConfirmedMessage;
      validateMessage(parsed);
      await this.handler(parsed);
      channel.ack(message);
    } catch (error) {
      this.logger.error(
        `Mensaje payment.confirmed rechazado: ${errorMessage(error)}`,
      );
      channel.nack(message, false, false);
    }
  }

  private publishLocally(message: PaymentConfirmedMessage) {
    if (!this.handler) {
      this.logger.error(
        'No existe consumidor local para payment.confirmed; mensaje descartado',
      );
      return;
    }
    this.logger.warn(
      `Entrega local de payment.confirmed eventId=${message.eventId} paymentId=${message.paymentId} bookingId=${message.bookingId}`,
    );
    setImmediate(() => {
      void this.handler?.(message).catch((error) => {
        this.logger.error(
          `Error procesando payment.confirmed local: ${errorMessage(error)}`,
        );
      });
    });
  }
}

function validateMessage(message: PaymentConfirmedMessage) {
  if (
    message.eventName !== 'payment.confirmed' ||
    !message.eventId ||
    !message.paymentId ||
    !message.bookingId ||
    !message.userId ||
    !message.providerId ||
    message.amount <= 0 ||
    message.currency !== 'COP'
  ) {
    throw new Error('Mensaje payment.confirmed inválido');
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
