import { Inject, Injectable } from '@nestjs/common';
import {
  BusinessRuleError,
  EntityNotFoundError,
} from '../../shared-kernel/domain/shared/errors/domain-error';
import { Payment } from '../domain/entities/payment.entity';
import { PAYMENT_REPOSITORY } from '../domain/repositories/payment.repository';
import type { PaymentRepository } from '../domain/repositories/payment.repository';
import type { PaymentMethod } from '../../shared-kernel/domain/shared/types';
import { PETCARE_PAYMENT_GATEWAY } from '../../shared-kernel/application/ports/integration.ports';
import type {
  MockPaymentCard,
  PaymentGateway,
} from '../../shared-kernel/application/ports/integration.ports';
import {
  createId,
  numberValue,
  now,
  required,
  type Input,
} from '../../shared-kernel/application/shared/application.utils';

@Injectable()
export class PaymentsApplicationService {
  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly payments: PaymentRepository,
    @Inject(PETCARE_PAYMENT_GATEWAY)
    private readonly gateway: PaymentGateway,
  ) {}

  async create(input: Input) {
    required(input, ['amount', 'method']);
    const method = readPaymentMethod(input.method);
    const card =
      method === 'online' && input.cardNumber !== undefined
        ? readMockCard(input)
        : undefined;
    return this.charge(numberValue(input, 'amount'), method, undefined, card);
  }

  createPending(userId: string, amount: number, method: PaymentMethod) {
    return Payment.create({
      id: createId('payment'),
      userId,
      method,
      amount,
      status: 'pending',
      provider: 'mock',
      reference: `PENDING-${createId('payment').slice(-12).toUpperCase()}`,
      createdAt: now(),
    });
  }

  async charge(
    amount: number,
    method: PaymentMethod,
    userId?: string,
    card?: MockPaymentCard,
  ) {
    const payment = Payment.create({
      id: createId('payment'),
      userId,
      method,
      amount,
      status: 'pending',
      provider: 'mock',
      reference: `PENDING-${createId('payment').slice(-12).toUpperCase()}`,
      createdAt: now(),
    });
    return this.process(payment, card);
  }

  async process(payment: Payment, card?: MockPaymentCard) {
    if (payment.status === 'paid') {
      return payment;
    }
    if (payment.method === 'online' && !card) {
      throw new BusinessRuleError(
        'Los pagos online requieren los datos de la tarjeta',
      );
    }
    payment.startAttempt();
    const result = await this.gateway.charge(
      payment.amount,
      payment.method,
      card,
    );
    payment.setReference(result.reference);
    if (result.status === 'paid') {
      payment.markPaid();
    } else if (result.status === 'failed') {
      payment.markFailed(result.failureReason);
    }
    return payment;
  }

  async processInput(payment: Payment, input: Input) {
    if (payment.status === 'paid') {
      return payment;
    }
    return this.process(payment, readMockCard(input));
  }

  async save(payment: Payment) {
    await this.payments.save(payment);
    return payment;
  }

  async pay(input: Input, payment: Payment) {
    const card = readMockCard(input);
    const result = await this.process(payment, card);
    await this.payments.save(result);
    return result;
  }

  async findById(id: string) {
    const payment = await this.payments.findById(id);
    if (!payment) {
      throw new EntityNotFoundError('Pago no encontrado');
    }
    return payment;
  }
}

function readPaymentMethod(value: unknown): PaymentMethod {
  if (value === 'online' || value === 'at-location') {
    return value;
  }
  throw new BusinessRuleError('method debe ser online o at-location');
}

function readMockCard(input: Input): MockPaymentCard {
  const cardholderName = stringValue(input.cardholderName).trim();
  const cardNumber = stringValue(input.cardNumber).replace(/\s/g, '');
  const expiryMonth = Number(input.expiryMonth);
  const expiryYear = Number(input.expiryYear);
  const cvv = stringValue(input.cvv).trim();
  if (
    cardholderName.length < 2 ||
    !/^\d{13,19}$/.test(cardNumber) ||
    !Number.isInteger(expiryMonth) ||
    expiryMonth < 1 ||
    expiryMonth > 12 ||
    !Number.isInteger(expiryYear) ||
    expiryYear < new Date().getFullYear() ||
    !/^\d{3,4}$/.test(cvv)
  ) {
    throw new BusinessRuleError(
      'Los datos de la tarjeta no tienen un formato válido',
    );
  }
  const nowDate = new Date();
  if (
    expiryYear === nowDate.getFullYear() &&
    expiryMonth < nowDate.getMonth() + 1
  ) {
    throw new BusinessRuleError('La tarjeta está vencida');
  }
  return {
    cardholderName,
    cardNumber,
    expiryMonth,
    expiryYear,
    cvv,
  };
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}
