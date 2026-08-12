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
import {
  IntegrationOutboxOrmEntity,
  toContextSnapshotEnvelope,
} from '../persistence/entities/integration-outbox.orm-entity';

@Injectable()
export class ContextOutboxPublisherService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ContextOutboxPublisherService.name);
  private readonly url =
    process.env.CLOUDAMQP_URL?.trim() || process.env.RABBITMQ_URL?.trim() || '';
  private readonly exchange =
    process.env.RABBITMQ_EXCHANGE?.trim() ||
    process.env.AMQP_EXCHANGE?.trim() ||
    'petcare.events';
  private readonly pollMilliseconds = positiveInteger(
    process.env.CONTEXT_OUTBOX_POLL_MS,
    1000,
  );
  private readonly workerId = `${hostname()}:${process.pid}:${randomUUID()}`;

  private connection?: ChannelModel;
  private channel?: ConfirmChannel;
  private connecting?: Promise<void>;
  private timer?: NodeJS.Timeout;
  private flushing = false;
  private stopping = false;

  constructor(
    @InjectRepository(IntegrationOutboxOrmEntity)
    private readonly outbox: Repository<IntegrationOutboxOrmEntity>,
  ) {}

  onModuleInit() {
    if (!this.url) {
      this.logger.warn(
        'RabbitMQ no configurado; los snapshots permanecerán en el outbox',
      );
      return;
    }
    this.timer = setInterval(() => void this.flush(), this.pollMilliseconds);
    void this.flush();
  }

  async onModuleDestroy() {
    this.stopping = true;
    if (this.timer) {
      clearInterval(this.timer);
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
  }

  private async flush() {
    if (this.flushing || this.stopping) {
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
      this.logger.error(`Error procesando context outbox: ${message(error)}`);
    } finally {
      this.flushing = false;
    }
  }

  private async releaseStaleClaims() {
    const staleBefore = new Date(Date.now() - 5 * 60_000);
    await this.outbox.update(
      { status: 'processing', lockedAt: LessThan(staleBefore) },
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
        .getRepository(IntegrationOutboxOrmEntity)
        .createQueryBuilder('outbox')
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .where('outbox.status = :status', { status: 'pending' })
        .andWhere('outbox.nextAttemptAt <= :now', { now: new Date() })
        .orderBy('outbox.occurredAt', 'ASC')
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

  private async publish(record: IntegrationOutboxOrmEntity) {
    try {
      await this.connect();
      if (!this.channel) {
        throw new Error('RabbitMQ no está disponible');
      }
      const envelope = toContextSnapshotEnvelope(record);
      const accepted = this.channel.publish(
        this.exchange,
        envelope.eventType,
        Buffer.from(JSON.stringify(envelope)),
        {
          contentType: 'application/json',
          deliveryMode: 2,
          persistent: true,
          messageId: envelope.eventId,
          type: envelope.eventType,
          timestamp: record.occurredAt.getTime(),
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
          id: record.id,
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
      this.logger.log(
        `Publicado ${envelope.eventType} eventId=${envelope.eventId}`,
      );
    } catch (error) {
      this.resetConnection();
      const retryAt = new Date(
        Date.now() + Math.min(60_000, 1000 * 2 ** Math.min(record.attempts, 6)),
      );
      await this.outbox.update(
        {
          id: record.id,
          status: 'processing',
          lockedBy: this.workerId,
        },
        {
          status: 'pending',
          nextAttemptAt: retryAt,
          lockedAt: null,
          lockedBy: null,
          lastError: message(error).slice(0, 65_535),
        },
      );
      this.logger.warn(
        `Reintento ${record.eventType} eventId=${record.id}: ${message(error)}`,
      );
    }
  }

  private async connect() {
    if (this.connection && this.channel) {
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
    const connection = await amqp.connect(this.url);
    connection.on('error', (error) => {
      this.logger.error(`RabbitMQ context publisher error: ${error.message}`);
    });
    connection.on('close', () => this.resetConnection());
    const channel = await connection.createConfirmChannel();
    await channel.assertExchange(this.exchange, 'topic', { durable: true });
    this.connection = connection;
    this.channel = channel;
  }

  private resetConnection() {
    this.channel = undefined;
    this.connection = undefined;
  }
}

function message(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
