import type { DataSource, EntityManager } from 'typeorm';
import { PaymentCommandService } from '../../src/modules/payment/application/payment-command.service';
import type { SagaMessage } from '../../src/modules/shared-kernel/application/ports/saga-message-bus.port';
import { PaymentOrmEntity } from '../../src/modules/payment/infrastructure/persistence/entities/payment.orm-entity';
import {
  PaymentCommandInboxOrmEntity,
  PaymentCommandTokenOrmEntity,
  PaymentSagaOutboxOrmEntity,
} from '../../src/modules/payment/infrastructure/persistence/entities/payment-command.orm-entities';

describe('PaymentCommandService', () => {
  it('uses Booking paymentId and ignores duplicate event delivery', async () => {
    const persistence = new PaymentPersistence();
    const service = new PaymentCommandService(persistence.dataSource());
    const command = intent();

    await service.process(command);
    await service.process(command);

    expect(persistence.payments.get('payment_1')).toMatchObject({
      id: 'payment_1',
      bookingId: 'booking_1',
      status: 'pending',
    });
    expect(persistence.inbox).toHaveLength(1);
    expect(persistence.outbox).toHaveLength(1);
    expect(persistence.outbox[0]).toMatchObject({
      eventName: 'payment.intent.created',
      status: 'pending',
      attempts: 0,
      publishedAt: null,
    });
  });

  it('captures a token once and rejects its use by another payment', async () => {
    const persistence = new PaymentPersistence();
    const service = new PaymentCommandService(persistence.dataSource());
    await service.process(intent());
    await service.process(capture('capture_1', 'mock_tok_single_use'));
    await service.process(
      intent({
        eventId: 'intent_2',
        bookingId: 'booking_2',
        paymentId: 'payment_2',
      }),
    );
    await service.process(
      capture('capture_2', 'mock_tok_single_use', {
        bookingId: 'booking_2',
        paymentId: 'payment_2',
      }),
    );

    expect(persistence.payments.get('payment_1')?.status).toBe('paid');
    expect(persistence.payments.get('payment_2')?.status).toBe('pending');
    expect(persistence.tokens).toHaveLength(1);
    expect(persistence.tokens[0].tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(persistence)).not.toContain('mock_tok_single_use');
    expect(persistence.outbox.at(-1)?.payload).toMatchObject({
      eventName: 'payment.capture.failed',
      retryable: false,
    });
  });

  it('returns an existing intent for a new event with the same business keys', async () => {
    const persistence = new PaymentPersistence();
    const service = new PaymentCommandService(persistence.dataSource());
    await service.process(intent());
    await service.process(intent({ eventId: 'intent_retry' }));

    expect(persistence.payments.size).toBe(1);
    expect(persistence.outbox).toHaveLength(2);
    expect(
      persistence.outbox.every(
        (record) => record.eventName === 'payment.intent.created',
      ),
    ).toBe(true);
  });

  it('rejects a capture whose booking does not own the payment', async () => {
    const persistence = new PaymentPersistence();
    const service = new PaymentCommandService(persistence.dataSource());
    await service.process(intent());
    await service.process(
      capture('capture_wrong_booking', 'mock_tok_wrong_booking', {
        bookingId: 'booking_other',
      }),
    );

    expect(persistence.payments.get('payment_1')?.status).toBe('pending');
    expect(persistence.tokens).toHaveLength(0);
    expect(persistence.outbox.at(-1)?.payload).toMatchObject({
      eventName: 'payment.capture.failed',
      retryable: false,
    });
  });

  it('confirms any mock token and never stores the raw token', async () => {
    const persistence = new PaymentPersistence();
    const service = new PaymentCommandService(persistence.dataSource());
    await service.process(intent());
    await service.process(capture('capture_declined', 'mock_tok_declined'));

    expect(persistence.payments.get('payment_1')).toMatchObject({
      status: 'paid',
    });
    expect(persistence.tokens[0]).toMatchObject({ outcome: 'confirmed' });
    expect(persistence.outbox.at(-1)?.payload).toMatchObject({
      eventName: 'payment.confirmed',
    });
    expect(persistence.outbox.at(-1)?.payload).not.toHaveProperty(
      'mockPaymentToken',
    );
  });

  it('confirms at-location payments and preserves idempotent refunds', async () => {
    const persistence = new PaymentPersistence();
    const service = new PaymentCommandService(persistence.dataSource());
    const atLocation = intent({ paymentMethod: 'at-location' });
    await service.process(atLocation);
    await service.process({
      ...atLocation,
      eventId: 'confirm_location',
      eventName: 'payment.confirm-at-location',
    });
    await service.process({
      ...atLocation,
      eventId: 'refund_1',
      eventName: 'payment.refund',
    });
    await service.process({
      ...atLocation,
      eventId: 'refund_2',
      eventName: 'payment.refund',
    });

    expect(persistence.payments.get('payment_1')?.status).toBe('refunded');
    expect(
      persistence.outbox.slice(-2).map((record) => record.eventName),
    ).toEqual(['payment.refunded', 'payment.refunded']);
  });

  it('rolls back payment and inbox when response outbox insertion fails', async () => {
    const persistence = new PaymentPersistence();
    persistence.failOutboxInsert = true;
    const service = new PaymentCommandService(persistence.dataSource());

    await expect(service.process(intent())).rejects.toThrow(
      'simulated outbox failure',
    );
    expect(persistence.payments.size).toBe(0);
    expect(persistence.inbox).toHaveLength(0);
    expect(persistence.outbox).toHaveLength(0);
  });
});

function intent(extra: Partial<SagaMessage> = {}): SagaMessage {
  return {
    eventId: 'intent_1',
    eventName: 'payment.intent.create',
    occurredAt: '2026-08-12T12:00:00.000Z',
    sagaId: 'saga_1',
    bookingId: 'booking_1',
    paymentId: 'payment_1',
    userId: 'user_1',
    providerId: 'provider_1',
    amount: 45000,
    currency: 'COP',
    paymentMethod: 'online',
    attempt: 1,
    ...extra,
  };
}

function capture(
  eventId: string,
  mockPaymentToken: string,
  extra: Partial<SagaMessage> = {},
): SagaMessage {
  return {
    ...intent(),
    eventId,
    eventName: 'payment.capture-token',
    mockPaymentToken,
    ...extra,
  };
}

class PaymentPersistence {
  payments = new Map<string, PaymentOrmEntity>();
  inbox: PaymentCommandInboxOrmEntity[] = [];
  outbox: PaymentSagaOutboxOrmEntity[] = [];
  tokens: PaymentCommandTokenOrmEntity[] = [];
  failOutboxInsert = false;

  dataSource() {
    return {
      transaction: async <T>(
        work: (manager: EntityManager) => Promise<T>,
      ): Promise<T> => {
        const transaction = this.clone();
        const result = await work(transaction.manager());
        this.payments = transaction.payments;
        this.inbox = transaction.inbox;
        this.outbox = transaction.outbox;
        this.tokens = transaction.tokens;
        return result;
      },
    } as DataSource;
  }

  private clone() {
    const copy = new PaymentPersistence();
    copy.payments = new Map(
      [...this.payments].map(([id, payment]) => [
        id,
        Object.assign(new PaymentOrmEntity(), payment),
      ]),
    );
    copy.inbox = this.inbox.map((record) => ({ ...record }));
    copy.outbox = this.outbox.map((record) => ({
      ...record,
      payload: { ...record.payload },
    }));
    copy.tokens = this.tokens.map((record) => ({ ...record }));
    copy.failOutboxInsert = this.failOutboxInsert;
    return copy;
  }

  private manager(): EntityManager {
    return {
      getRepository: <T extends object>(entity: new () => T) =>
        this.repository(entity),
    } as EntityManager;
  }

  private repository<T extends object>(entity: new () => T) {
    const records = this.records(entity);
    return {
      create: (value: Partial<T>) => Object.assign(new entity(), value),
      findOne: ({ where }: { where: Partial<T> }) =>
        Promise.resolve(
          records.find((record) => matches(record, where)) ?? null,
        ),
      insert: (value: Partial<T>) => {
        if (entity === PaymentSagaOutboxOrmEntity && this.failOutboxInsert) {
          throw new Error('simulated outbox failure');
        }
        const record = Object.assign(new entity(), value);
        if (entity === PaymentOrmEntity) {
          this.payments.set(
            (record as unknown as PaymentOrmEntity).id,
            record as unknown as PaymentOrmEntity,
          );
        } else {
          records.push(record);
        }
        return Promise.resolve();
      },
      save: (value: T) => {
        if (entity === PaymentOrmEntity) {
          this.payments.set(
            (value as unknown as PaymentOrmEntity).id,
            value as unknown as PaymentOrmEntity,
          );
          return Promise.resolve(value);
        }
        const key = entityKey(entity, value);
        const index = records.findIndex(
          (record) => entityKey(entity, record) === key,
        );
        if (index >= 0) {
          records[index] = value;
        } else {
          records.push(value);
        }
        return Promise.resolve(value);
      },
      createQueryBuilder: () => new FakeQueryBuilder(records),
    };
  }

  private records<T extends object>(entity: new () => T): T[] {
    if (entity === PaymentOrmEntity) {
      return [...this.payments.values()] as T[];
    }
    if (entity === PaymentCommandInboxOrmEntity) {
      return this.inbox as T[];
    }
    if (entity === PaymentSagaOutboxOrmEntity) {
      return this.outbox as T[];
    }
    if (entity === PaymentCommandTokenOrmEntity) {
      return this.tokens as T[];
    }
    throw new Error(`Unsupported entity ${entity.name}`);
  }
}

class FakeQueryBuilder<T extends object> {
  private condition = '';
  private parameters: Record<string, unknown> = {};

  constructor(private readonly records: T[]) {}

  setLock() {
    return this;
  }

  where(condition: string, parameters: Record<string, unknown>) {
    this.condition = condition;
    this.parameters = parameters;
    return this;
  }

  getOne() {
    const [parameter, expected] = Object.entries(this.parameters)[0] ?? [];
    if (!parameter) {
      return Promise.resolve(null);
    }
    const property =
      parameter === 'bookingId'
        ? 'bookingId'
        : parameter === 'tokenHash'
          ? 'tokenHash'
          : 'id';
    return Promise.resolve(
      this.records.find(
        (record) =>
          this.condition.includes(parameter) &&
          record[property as keyof T] === expected,
      ) ?? null,
    );
  }
}

function matches<T extends object>(record: T, where: Partial<T>) {
  return Object.entries(where).every(
    ([property, value]) => record[property as keyof T] === value,
  );
}

function entityKey<T extends object>(entity: new () => T, value: T) {
  const property =
    entity === PaymentCommandInboxOrmEntity
      ? 'eventId'
      : entity === PaymentSagaOutboxOrmEntity
        ? 'eventId'
        : entity === PaymentCommandTokenOrmEntity
          ? 'paymentId'
          : 'id';
  return value[property as keyof T];
}
