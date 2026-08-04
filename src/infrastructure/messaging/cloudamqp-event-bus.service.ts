import {
  Injectable,
  HttpException,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import amqp, { ChannelModel, ConfirmChannel, ConsumeMessage } from 'amqplib';
import {
  EventHandler,
  PetcareEvent,
  PetcareEventBus,
} from '../../application/ports/event-bus.port';
import { PaymentConfirmedEvent } from '../../domains/shared/petcare.types';

@Injectable()
export class CloudAmqpEventBusService
  implements PetcareEventBus, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(CloudAmqpEventBusService.name);
  private readonly url = (
    process.env.CLOUDAMQP_URL ??
    process.env.AMQP_URL ??
    ''
  ).trim();
  private readonly exchange = process.env.AMQP_EXCHANGE ?? 'petcare.events';
  private readonly queue =
    process.env.AMQP_QUEUE ?? 'petcare.bookings.payment-confirmed';
  private readonly routingKey =
    process.env.AMQP_ROUTING_KEY ?? 'payment.confirmed';
  private readonly prefetch = Number(process.env.AMQP_PREFETCH ?? 10);
  private readonly deadLetterQueue =
    process.env.AMQP_DEAD_LETTER_QUEUE ??
    `${process.env.AMQP_QUEUE ?? 'petcare.bookings.payment-confirmed'}.dead-letter`;
  private readonly maxRetries = Number(process.env.AMQP_MAX_RETRIES ?? 3);
  private connection?: ChannelModel;
  private channel?: ConfirmChannel;
  private readonly handlers = new Map<
    PetcareEvent['type'],
    EventHandler<PaymentConfirmedEvent>[]
  >();
  private readonly consuming = new Set<PetcareEvent['type']>();

  async onModuleInit() {
    if (!this.url) {
      this.logger.warn(
        'CloudAMQP no configurado; se usará el event bus local para desarrollo',
      );
      return;
    }

    try {
      this.connection = await amqp.connect(this.url);
      this.channel = await this.connection.createConfirmChannel();
      await this.channel.assertExchange(this.exchange, 'topic', {
        durable: true,
      });
      await this.channel.assertQueue(this.queue, { durable: true });
      await this.channel.assertQueue(this.deadLetterQueue, { durable: true });
      await this.channel.bindQueue(this.queue, this.exchange, this.routingKey);
      await this.channel.prefetch(this.prefetch);
      for (const eventType of this.handlers.keys()) {
        await this.startConsumer(eventType);
      }
      this.logger.log(
        `[AMQP_CONNECTED] exchange=${this.exchange} queue=${this.queue} ` +
          `routingKey=${this.routingKey}`,
      );
    } catch (error) {
      await this.closeConnection();
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `No se pudo conectar a CloudAMQP; se usará el event bus local. ${message}`,
      );
    }
  }

  isAvailable() {
    return Boolean(this.channel);
  }

  async subscribe(
    eventType: PetcareEvent['type'],
    handler: EventHandler<PaymentConfirmedEvent>,
  ) {
    const handlers = this.handlers.get(eventType) ?? [];
    handlers.push(handler);
    this.handlers.set(eventType, handlers);
    if (this.channel) await this.startConsumer(eventType);
    this.logger.log(
      `[EVENT_CONSUMER_REGISTERED] event=${eventType} ` +
        `transport=${this.channel ? 'cloudamqp' : 'local'} queue=${this.queue}`,
    );
  }

  async publish(event: PetcareEvent) {
    if (this.channel) {
      this.logger.log(
        `[AMQP_EVENT_PUBLISHING] event=${event.type} ` +
          `eventId=${event.eventId} paymentId=${event.payment.id} ` +
          `exchange=${this.exchange}`,
      );
      this.channel.publish(
        this.exchange,
        event.type,
        Buffer.from(JSON.stringify(event)),
        {
          contentType: 'application/json',
          deliveryMode: 2,
          messageId: event.eventId,
          type: event.type,
        },
      );
      await this.channel.waitForConfirms();
      this.logger.log(
        `[AMQP_EVENT_PUBLISHED] event=${event.type} ` +
          `eventId=${event.eventId} paymentId=${event.payment.id}`,
      );
      return;
    }

    this.logger.log(
      `[LOCAL_EVENT_DISPATCH] event=${event.type} ` +
        `eventId=${event.eventId} paymentId=${event.payment.id}`,
    );
    const handlers = this.handlers.get(event.type) ?? [];
    await Promise.all(handlers.map((handler) => handler(event)));
  }

  async onModuleDestroy() {
    await this.closeConnection();
  }

  private async startConsumer(eventType: PetcareEvent['type']) {
    if (!this.channel || this.consuming.has(eventType)) return;
    this.consuming.add(eventType);
    await this.channel.consume(this.queue, (message) => {
      if (!message) return;
      void this.handleMessage(message);
    });
  }

  private async handleMessage(message: ConsumeMessage) {
    let eventContext = 'event=unknown';
    try {
      const event = JSON.parse(
        message.content.toString(),
      ) as PaymentConfirmedEvent;
      if (event.type !== 'payment.confirmed') {
        this.logger.warn('[AMQP_EVENT_IGNORED] unsupported event type');
        this.channel?.nack(message, false, false);
        return;
      }
      eventContext =
        `event=${event.type} eventId=${event.eventId} ` +
        `paymentId=${event.payment.id}`;
      this.logger.log(`[AMQP_EVENT_RECEIVED] ${eventContext}`);
      const handlers = this.handlers.get(event.type) ?? [];
      for (const handler of handlers) await handler(event);
      this.channel?.ack(message);
      this.logger.log(`[AMQP_EVENT_ACK] ${eventContext}`);
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : String(error);
      const retryCount = this.getRetryCount(message);
      const permanentError = this.isPermanentError(error);

      if (permanentError || retryCount >= this.maxRetries) {
        try {
          await this.moveToDeadLetter(message, eventContext, messageText);
        } catch (deadLetterError) {
          const deadLetterMessage =
            deadLetterError instanceof Error
              ? deadLetterError.message
              : String(deadLetterError);
          this.logger.error(
            `[AMQP_EVENT_DEAD_LETTER_FAILED] ${eventContext} ` +
              `error=${deadLetterMessage}`,
          );
          this.channel?.nack(message, false, true);
        }
        return;
      }

      try {
        await this.retryMessage(message, retryCount + 1);
        this.logger.warn(
          `[AMQP_EVENT_REQUEUED] ${eventContext} ` +
            `retry=${retryCount + 1}/${this.maxRetries} error=${messageText}`,
        );
      } catch (retryError) {
        const retryMessageText =
          retryError instanceof Error ? retryError.message : String(retryError);
        this.logger.error(
          `[AMQP_EVENT_REQUEUE_FAILED] ${eventContext} error=${retryMessageText}`,
        );
        this.channel?.nack(message, false, true);
      }
    }
  }

  private isPermanentError(error: unknown) {
    return (
      error instanceof HttpException &&
      error.getStatus() >= 400 &&
      error.getStatus() < 500
    );
  }

  private getRetryCount(message: ConsumeMessage) {
    const headers = this.getMessageHeaders(message);
    const retryCount = headers?.['x-petcare-retry'];
    return typeof retryCount === 'number' && Number.isInteger(retryCount)
      ? retryCount
      : 0;
  }

  private getMessageHeaders(message: ConsumeMessage) {
    const rawHeaders: unknown = message.properties.headers;
    return rawHeaders && typeof rawHeaders === 'object'
      ? (rawHeaders as Record<string, unknown>)
      : {};
  }

  private async retryMessage(message: ConsumeMessage, retryCount: number) {
    if (!this.channel) return;
    this.channel.publish(this.exchange, this.routingKey, message.content, {
      contentType: 'application/json',
      deliveryMode: 2,
      headers: {
        ...this.getMessageHeaders(message),
        'x-petcare-retry': retryCount,
      },
    });
    await this.channel.waitForConfirms();
    this.channel.ack(message);
  }

  private async moveToDeadLetter(
    message: ConsumeMessage,
    eventContext: string,
    reason: string,
  ) {
    if (!this.channel) return;
    this.channel.sendToQueue(this.deadLetterQueue, message.content, {
      contentType: 'application/json',
      deliveryMode: 2,
      headers: {
        ...this.getMessageHeaders(message),
        'x-petcare-dead-letter-reason': reason.slice(0, 250),
      },
    });
    await this.channel.waitForConfirms();
    this.channel.ack(message);
    this.logger.error(
      `[AMQP_EVENT_DEAD_LETTERED] ${eventContext} ` +
        `queue=${this.deadLetterQueue} reason=${reason}`,
    );
  }

  private async closeConnection() {
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
    this.channel = undefined;
    this.connection = undefined;
    this.consuming.clear();
  }
}
