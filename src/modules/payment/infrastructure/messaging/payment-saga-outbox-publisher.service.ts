import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import amqp, { type ChannelModel, type ConfirmChannel } from 'amqplib';
import { LessThan, Repository } from 'typeorm';
import { PaymentSagaOutboxOrmEntity } from '../persistence/entities/payment-command.orm-entities';

@Injectable()
export class PaymentSagaOutboxPublisherService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PaymentSagaOutboxPublisherService.name);
  private readonly url =
    process.env.CLOUDAMQP_URL?.trim() || process.env.RABBITMQ_URL?.trim() || '';
  private readonly exchange =
    process.env.RABBITMQ_EXCHANGE?.trim() ||
    process.env.AMQP_EXCHANGE?.trim() ||
    'petcare.events';
  private readonly pollMs = positiveInteger(
    process.env.PAYMENT_SAGA_OUTBOX_POLL_MS,
    1000,
  );
  private readonly workerId = `${hostname()}:${process.pid}:${randomUUID()}`;
  private connection?: ChannelModel;
  private channel?: ConfirmChannel;
  private timer?: NodeJS.Timeout;
  private flushing = false;
  private stopping = false;

  constructor(
    @InjectRepository(PaymentSagaOutboxOrmEntity)
    private readonly outbox: Repository<PaymentSagaOutboxOrmEntity>,
  ) {}

  onModuleInit() {
    if (!this.url) {
      this.logger.warn(
        'RabbitMQ no configurado; las respuestas Saga de Payment permanecerán pendientes',
      );
      return;
    }
    this.timer = setInterval(() => void this.flush(), this.pollMs);
    void this.flush();
  }

  async onModuleDestroy() {
    this.stopping = true;
    if (this.timer) {
      clearInterval(this.timer);
    }
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
  }

  async flush() {
    if (this.flushing || this.stopping || !this.url) {
      return;
    }
    this.flushing = true;
    try {
      await this.releaseStaleClaims();
      for (;;) {
        const record = await this.claimNext();
        if (!record) {
          break;
        }
        await this.publish(record);
      }
    } catch (error) {
      this.logger.error(`Error procesando payment outbox: ${message(error)}`);
    } finally {
      this.flushing = false;
    }
  }

  private async releaseStaleClaims() {
    await this.outbox.update(
      {
        status: 'processing',
        lockedAt: LessThan(new Date(Date.now() - 5 * 60_000)),
      },
      {
        status: 'pending',
        lockedAt: null,
        lockedBy: null,
        nextAttemptAt: new Date(),
      },
    );
  }

  private claimNext() {
    return this.outbox.manager.transaction(async (manager) => {
      const record = await manager
        .getRepository(PaymentSagaOutboxOrmEntity)
        .createQueryBuilder('outbox')
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .where('outbox.status = :status', { status: 'pending' })
        .andWhere('outbox.nextAttemptAt <= :now', { now: new Date() })
        .orderBy('outbox.createdAt', 'ASC')
        .getOne();
      if (!record) {
        return null;
      }
      record.status = 'processing';
      record.attempts += 1;
      record.lockedAt = new Date();
      record.lockedBy = this.workerId;
      return manager.save(record);
    });
  }

  private async publish(record: PaymentSagaOutboxOrmEntity) {
    try {
      await this.connect();
      if (!this.channel) {
        throw new Error('RabbitMQ no está disponible');
      }
      const accepted = this.channel.publish(
        this.exchange,
        record.eventName,
        Buffer.from(JSON.stringify(record.payload)),
        {
          contentType: 'application/json',
          deliveryMode: 2,
          persistent: true,
          messageId: record.eventId,
          type: record.eventName,
        },
      );
      if (!accepted) {
        await new Promise<void>((resolve) =>
          this.channel?.once('drain', resolve),
        );
      }
      await this.channel.waitForConfirms();
      await this.outbox.update(
        {
          eventId: record.eventId,
          status: 'processing',
          lockedBy: this.workerId,
        },
        {
          status: 'published',
          publishedAt: new Date(),
          lockedAt: null,
          lockedBy: null,
          lastError: null,
        },
      );
    } catch (error) {
      this.resetConnection();
      await this.outbox.update(
        {
          eventId: record.eventId,
          status: 'processing',
          lockedBy: this.workerId,
        },
        {
          status: 'pending',
          nextAttemptAt: new Date(
            Date.now() +
              Math.min(60_000, 1000 * 2 ** Math.min(record.attempts, 6)),
          ),
          lockedAt: null,
          lockedBy: null,
          lastError: message(error).slice(0, 65_535),
        },
      );
    }
  }

  private async connect() {
    if (this.connection && this.channel) {
      return;
    }
    const connection = await amqp.connect(this.url);
    connection.on('error', (error) =>
      this.logger.error(`RabbitMQ payment publisher error: ${error.message}`),
    );
    connection.on('close', () => this.resetConnection());
    const channel = await connection.createConfirmChannel();
    await channel.assertExchange(this.exchange, 'topic', { durable: true });
    this.connection = connection;
    this.channel = channel;
  }

  private resetConnection() {
    this.connection = undefined;
    this.channel = undefined;
  }
}

function message(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
