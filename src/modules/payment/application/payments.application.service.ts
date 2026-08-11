import { Inject, Injectable, Optional } from '@nestjs/common';
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
import { PAYMENT_EVENT_PUBLISHER } from '../../shared-kernel/application/ports/payment-event-bus.port';
import type { PaymentEventPublisher } from '../../shared-kernel/application/ports/payment-event-bus.port';
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
    @Optional()
    @Inject(PAYMENT_EVENT_PUBLISHER)
    private readonly eventPublisher?: PaymentEventPublisher,
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

  createPending(
    userId: string,
    amount: number,
    method: PaymentMethod,
    bookingId?: string,
  ) {
    return Payment.create({
      id: createId('payment'),
      userId,
      bookingId,
      method,
      amount,
      status: 'pending',
      provider: 'mock',
      reference: `PENDING-${createId('payment').slice(-12).toUpperCase()}`,
      createdAt: now(),
    });
  }

  async createIntent(
    userId: string,
    amount: number,
    method: PaymentMethod,
    bookingId: string,
  ) {
    const payment =
      method === 'at-location'
        ? Payment.create({
            id: createId('payment'),
            userId,
            bookingId,
            method,
            amount,
            status: 'paid',
            provider: 'mock',
            reference: `AT_LOCATION-${createId('payment')
              .slice(-12)
              .toUpperCase()}`,
            createdAt: now(),
            paidAt: now(),
          })
        : this.createPending(userId, amount, method, bookingId);
    await this.payments.save(payment);
    return payment;
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
    if (payment.status === 'refunded') {
      throw new BusinessRuleError('Un pago compensado no puede procesarse');
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

  async publishPaymentConfirmed(
    payment: Payment,
    booking: {
      id: string;
      userId: string;
      providerId: string;
    },
  ) {
    if (!this.eventPublisher) {
      throw new BusinessRuleError(
        'El publicador de eventos de pago no está disponible',
      );
    }
    const data = payment.toPrimitives();
    await this.eventPublisher.publishPaymentConfirmed({
      eventId: createId('payment-event'),
      eventName: 'payment.confirmed',
      paymentId: data.id,
      bookingId: booking.id,
      userId: booking.userId,
      providerId: booking.providerId,
      amount: data.amount,
      currency: data.currency,
      occurredAt: now(),
    });
  }

  async pay(input: Input, payment: Payment) {
    const card = readMockCard(input);
    const result = await this.process(payment, card);
    await this.payments.save(result);
    return result;
  }

  async chargeForBooking(input: {
    bookingId: string;
    userId: string;
    providerId: string;
    paymentId: string;
    amount: number;
    card: MockPaymentCard;
  }) {
    const payment = await this.findById(input.paymentId);
    if (
      payment.userId !== input.userId ||
      payment.bookingId !== input.bookingId
    ) {
      throw new BusinessRuleError('El pago no pertenece al usuario');
    }
    if (payment.method !== 'online' || payment.amount !== input.amount) {
      throw new BusinessRuleError(
        'El contexto del pago no coincide con la reserva',
      );
    }
    const result = await this.process(payment, input.card);
    await this.payments.save(result);
    return result;
  }

  async publishBookingConfirmation(input: {
    bookingId: string;
    userId: string;
    providerId: string;
    paymentId: string;
    amount: number;
  }) {
    const payment = await this.findById(input.paymentId);
    if (
      payment.userId !== input.userId ||
      payment.bookingId !== input.bookingId ||
      payment.amount !== input.amount ||
      payment.method !== 'online' ||
      payment.status !== 'paid'
    ) {
      throw new BusinessRuleError(
        'El pago no está listo para confirmar la reserva',
      );
    }
    await this.publishPaymentConfirmed(payment, {
      id: input.bookingId,
      userId: input.userId,
      providerId: input.providerId,
    });
  }

  async confirmAtLocation(input: {
    bookingId: string;
    userId: string;
    providerId: string;
    paymentId: string;
    amount: number;
  }) {
    const payment = await this.findById(input.paymentId);
    if (
      payment.userId !== input.userId ||
      payment.bookingId !== input.bookingId ||
      payment.method !== 'at-location' ||
      payment.amount !== input.amount ||
      payment.status !== 'paid'
    ) {
      throw new BusinessRuleError(
        'El contexto del pago at-location no coincide con la reserva',
      );
    }
    await this.publishPaymentConfirmed(payment, {
      id: input.bookingId,
      userId: input.userId,
      providerId: input.providerId,
    });
  }

  async cancelPending(paymentId: string) {
    const payment = await this.findById(paymentId);
    if (payment.status === 'pending') {
      payment.markFailed('La reserva no pudo persistirse');
      await this.payments.save(payment);
    }
  }

  async findById(id: string) {
    const payment = await this.payments.findById(id);
    if (!payment) {
      throw new EntityNotFoundError('Pago no encontrado');
    }
    return payment;
  }

  async refund(paymentId: string) {
    const payment = await this.findById(paymentId);
    payment.markRefunded();
    await this.payments.save(payment);
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
