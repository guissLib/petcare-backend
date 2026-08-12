import { createHash, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import type {
  SagaMessage,
  SagaMessageName,
} from '../../shared-kernel/application/ports/saga-message-bus.port';
import { PaymentOrmEntity } from '../infrastructure/persistence/entities/payment.orm-entity';
import {
  PaymentCommandInboxOrmEntity,
  PaymentCommandTokenOrmEntity,
  PaymentSagaOutboxOrmEntity,
  type PaymentTokenOutcome,
} from '../infrastructure/persistence/entities/payment-command.orm-entities';

const COMMAND_NAMES = [
  'payment.intent.create',
  'payment.capture-token',
  'payment.confirm-at-location',
  'payment.refund',
] as const satisfies SagaMessageName[];

type PaymentCommandName = (typeof COMMAND_NAMES)[number];

class PaymentCommandRejected extends Error {}

@Injectable()
export class PaymentCommandService {
  constructor(private readonly dataSource: DataSource) {}

  async process(message: SagaMessage) {
    await this.dataSource.transaction(async (manager) => {
      const inbox = manager.getRepository(PaymentCommandInboxOrmEntity);
      if (await inbox.findOne({ where: { eventId: message.eventId } })) {
        return;
      }

      const commandName = readCommandName(message.eventName);
      const receivedAt = new Date();
      const inboxRecord = inbox.create({
        eventId: requiredText(message.eventId, 'eventId'),
        eventName: commandName,
        receivedAt,
        completedAt: receivedAt,
        responseEventId: null,
      });
      await inbox.insert(inboxRecord);

      let response: SagaMessage;
      try {
        response = await this.execute(manager, commandName, message);
      } catch (error) {
        if (!(error instanceof PaymentCommandRejected)) {
          throw error;
        }
        response = failureResponse(commandName, message, error.message);
      }

      await manager.getRepository(PaymentSagaOutboxOrmEntity).insert({
        eventId: response.eventId,
        eventName: response.eventName,
        payload: response,
        status: 'pending',
        attempts: 0,
        nextAttemptAt: receivedAt,
        lockedAt: null,
        lockedBy: null,
        publishedAt: null,
        lastError: null,
        createdAt: receivedAt,
      });
      inboxRecord.responseEventId = response.eventId;
      inboxRecord.completedAt = new Date();
      await inbox.save(inboxRecord);
    });
  }

  private execute(
    manager: EntityManager,
    commandName: PaymentCommandName,
    message: SagaMessage,
  ) {
    switch (commandName) {
      case 'payment.intent.create':
        return this.createIntent(manager, message);
      case 'payment.capture-token':
        return this.captureToken(manager, message);
      case 'payment.confirm-at-location':
        return this.confirmAtLocation(manager, message);
      case 'payment.refund':
        return this.refund(manager, message);
    }
  }

  private async createIntent(manager: EntityManager, message: SagaMessage) {
    const context = paymentContext(message);
    const method = paymentMethod(message);
    const payments = manager.getRepository(PaymentOrmEntity);
    const existingById = await lockedPayment(manager, context.paymentId);
    const existingByBooking = await payments
      .createQueryBuilder('payment')
      .setLock('pessimistic_write')
      .where('payment.bookingId = :bookingId', {
        bookingId: context.bookingId,
      })
      .getOne();
    const existing = existingById ?? existingByBooking;

    if (existing) {
      assertPaymentContext(existing, context, method);
      if (existing.id !== context.paymentId) {
        reject('La reserva ya tiene otra intención de pago');
      }
      return response('payment.intent.created', message, context);
    }

    await payments.insert({
      id: context.paymentId,
      userId: context.userId,
      bookingId: context.bookingId,
      method,
      status: 'pending',
      amount: context.amount,
      currency: context.currency,
      provider: 'mock',
      reference: `INTENT-${randomUUID().toUpperCase()}`,
      createdAt: new Date(),
      paidAt: null,
      failureReason: null,
      attempts: 0,
    });
    return response('payment.intent.created', message, context);
  }

  private async captureToken(manager: EntityManager, message: SagaMessage) {
    const context = paymentContext(message);
    if (paymentMethod(message) !== 'online') {
      reject('payment.capture-token requiere paymentMethod online');
    }
    const token = requiredText(message.mockPaymentToken, 'mockPaymentToken');
    if (!/^mock_tok_[A-Za-z0-9_-]+$/.test(token)) {
      reject('El token mock no es válido');
    }

    const payment = await requiredPayment(manager, context.paymentId);
    assertPaymentContext(payment, context, 'online');
    if (payment.status === 'refunded') {
      reject('Un pago compensado no puede capturarse');
    }

    const tokens = manager.getRepository(PaymentCommandTokenOrmEntity);
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const existingByHash = await tokens
      .createQueryBuilder('token')
      .setLock('pessimistic_write')
      .where('token.tokenHash = :tokenHash', { tokenHash })
      .getOne();
    const existingByPayment = await tokens.findOne({
      where: { paymentId: context.paymentId },
    });
    const existing = existingByHash ?? existingByPayment;
    if (existing) {
      if (
        existing.paymentId !== context.paymentId ||
        existing.tokenHash !== tokenHash
      ) {
        reject('El token mock ya fue usado por otro pago');
      }
      return existing.outcome === 'confirmed'
        ? response('payment.confirmed', message, context)
        : failureResponse(
            'payment.capture-token',
            message,
            'El token mock fue rechazado',
          );
    }

    const declined = /declin(?:e|ed)?/i.test(token) || token.endsWith('0002');
    const outcome: PaymentTokenOutcome = declined ? 'declined' : 'confirmed';
    const usedAt = new Date();
    await tokens.insert({
      paymentId: context.paymentId,
      tokenHash,
      outcome,
      usedAt,
    });
    payment.attempts += 1;
    payment.reference = `MOCK-${randomUUID().slice(0, 8).toUpperCase()}`;
    if (declined) {
      payment.status = 'failed';
      payment.failureReason = 'El token mock fue rechazado';
      payment.paidAt = null;
    } else {
      payment.status = 'paid';
      payment.failureReason = null;
      payment.paidAt = usedAt;
    }
    await manager.getRepository(PaymentOrmEntity).save(payment);

    return declined
      ? failureResponse(
          'payment.capture-token',
          message,
          'El token mock fue rechazado',
        )
      : response('payment.confirmed', message, context);
  }

  private async confirmAtLocation(
    manager: EntityManager,
    message: SagaMessage,
  ) {
    const context = paymentContext(message);
    if (paymentMethod(message) !== 'at-location') {
      reject('payment.confirm-at-location requiere paymentMethod at-location');
    }
    const payment = await requiredPayment(manager, context.paymentId);
    assertPaymentContext(payment, context, 'at-location');
    if (payment.status === 'refunded') {
      reject('Un pago compensado no puede confirmarse');
    }
    if (payment.status !== 'paid') {
      payment.status = 'paid';
      payment.paidAt = new Date();
      payment.failureReason = null;
      payment.attempts += 1;
      payment.reference = `AT_LOCATION-${randomUUID()
        .slice(0, 8)
        .toUpperCase()}`;
      await manager.getRepository(PaymentOrmEntity).save(payment);
    }
    return response('payment.confirmed', message, context);
  }

  private async refund(manager: EntityManager, message: SagaMessage) {
    const context = paymentContext(message);
    const payment = await requiredPayment(manager, context.paymentId);
    assertPaymentContext(payment, context, paymentMethod(message));
    if (payment.status !== 'paid' && payment.status !== 'refunded') {
      reject('Solo se puede compensar un pago aprobado');
    }
    if (payment.status !== 'refunded') {
      payment.status = 'refunded';
      payment.failureReason = null;
      await manager.getRepository(PaymentOrmEntity).save(payment);
    }
    return response('payment.refunded', message, context);
  }
}

function readCommandName(eventName: SagaMessageName): PaymentCommandName {
  if ((COMMAND_NAMES as readonly SagaMessageName[]).includes(eventName)) {
    return eventName as PaymentCommandName;
  }
  throw new Error(`Comando de pago no soportado: ${eventName}`);
}

function paymentContext(message: SagaMessage) {
  const currency = requiredText(message.currency, 'currency');
  if (currency !== 'COP') {
    reject('currency debe ser COP');
  }
  const amount = message.amount;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    reject('amount debe ser un número positivo');
  }
  return {
    bookingId: requiredText(message.bookingId, 'bookingId'),
    paymentId: requiredText(message.paymentId, 'paymentId'),
    userId: requiredText(message.userId, 'userId'),
    providerId: requiredText(message.providerId, 'providerId'),
    amount,
    currency,
  };
}

function paymentMethod(message: SagaMessage) {
  if (
    message.paymentMethod === 'online' ||
    message.paymentMethod === 'at-location'
  ) {
    return message.paymentMethod;
  }
  reject('paymentMethod no es válido');
}

async function requiredPayment(manager: EntityManager, paymentId: string) {
  const payment = await lockedPayment(manager, paymentId);
  if (!payment) {
    reject('Pago no encontrado');
  }
  return payment;
}

function lockedPayment(manager: EntityManager, paymentId: string) {
  return manager
    .getRepository(PaymentOrmEntity)
    .createQueryBuilder('payment')
    .setLock('pessimistic_write')
    .where('payment.id = :paymentId', { paymentId })
    .getOne();
}

function assertPaymentContext(
  payment: PaymentOrmEntity,
  context: ReturnType<typeof paymentContext>,
  method: 'online' | 'at-location',
) {
  if (
    payment.id !== context.paymentId ||
    payment.bookingId !== context.bookingId ||
    payment.userId !== context.userId ||
    payment.amount !== context.amount ||
    payment.currency !== context.currency ||
    payment.method !== method
  ) {
    reject('El contexto del pago no coincide con la reserva');
  }
}

function response(
  eventName: SagaMessageName,
  command: SagaMessage,
  context: ReturnType<typeof paymentContext>,
): SagaMessage {
  return {
    eventId: randomUUID(),
    eventName,
    occurredAt: new Date().toISOString(),
    sagaId: command.sagaId,
    ...context,
    paymentMethod: command.paymentMethod,
    attempt: command.attempt,
  };
}

function failureResponse(
  commandName: PaymentCommandName,
  command: SagaMessage,
  reason: string,
): SagaMessage {
  const eventName =
    commandName === 'payment.intent.create'
      ? 'payment.intent.failed'
      : commandName === 'payment.refund'
        ? 'payment.refund.failed'
        : 'payment.capture.failed';
  return {
    eventId: randomUUID(),
    eventName,
    occurredAt: new Date().toISOString(),
    sagaId: command.sagaId,
    bookingId: text(command.bookingId),
    paymentId: text(command.paymentId),
    userId: text(command.userId),
    providerId: text(command.providerId),
    amount: typeof command.amount === 'number' ? command.amount : undefined,
    currency: text(command.currency),
    paymentMethod: command.paymentMethod,
    attempt: command.attempt,
    reason: reason.slice(0, 500),
    retryable: false,
  };
}

function requiredText(value: unknown, field: string) {
  const result = text(value);
  if (!result) {
    reject(`${field} es requerido`);
  }
  return result;
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function reject(message: string): never {
  throw new PaymentCommandRejected(message);
}
