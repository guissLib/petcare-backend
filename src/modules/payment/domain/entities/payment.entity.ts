import { BusinessRuleError } from '../../../shared-kernel/domain/shared/errors/domain-error';
import { Money } from '../../../shared-kernel/domain/value-objects/money.vo';
import type {
  PaymentMethod,
  PaymentPrimitives,
  PaymentStatus,
} from '../../../shared-kernel/domain/shared/types';
import type { DomainEvent } from '../../../shared-kernel/domain/events/domain-event';
import { PaymentCreatedDomainEvent } from '../events/payment-created.domain-event';

export interface NewPaymentProps {
  id: string;
  userId?: string;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  provider: 'mock';
  reference: string;
  createdAt: string;
  paidAt?: string;
  failureReason?: string;
  attempts?: number;
}

export class Payment {
  private constructor(
    private readonly props: PaymentPrimitives,
    private readonly domainEvents: DomainEvent[] = [],
  ) {}

  static create(input: NewPaymentProps) {
    if (!input.reference?.trim()) {
      throw new BusinessRuleError('reference es requerido');
    }
    const money = Money.cop(input.amount);
    const payment = new Payment({
      ...input,
      amount: money.amount,
      currency: money.currency,
      reference: input.reference.trim(),
      attempts: input.attempts ?? 0,
    });
    payment.domainEvents.push(
      new PaymentCreatedDomainEvent(payment.id, payment.amount, payment.method),
    );
    return payment;
  }

  static rehydrate(props: PaymentPrimitives) {
    return new Payment({
      ...props,
      attempts: props.attempts ?? 0,
    });
  }

  pullDomainEvents() {
    const events = [...this.domainEvents];
    this.domainEvents.length = 0;
    return events;
  }

  startAttempt() {
    if (this.props.status === 'paid') {
      return;
    }
    this.props.status = 'pending';
    this.props.failureReason = undefined;
    this.props.attempts += 1;
  }

  markPaid(paidAt = new Date().toISOString()) {
    this.props.status = 'paid';
    this.props.paidAt = paidAt;
    this.props.failureReason = undefined;
  }

  markFailed(reason = 'El pago no fue aprobado') {
    this.props.status = 'failed';
    this.props.failureReason = reason;
  }

  setReference(reference: string) {
    if (!reference.trim()) {
      throw new BusinessRuleError('La referencia del pago es requerida');
    }
    this.props.reference = reference.trim();
  }

  get id() {
    return this.props.id;
  }

  get method() {
    return this.props.method;
  }

  get userId() {
    return this.props.userId;
  }

  get status() {
    return this.props.status;
  }

  get amount() {
    return this.props.amount;
  }

  toPrimitives() {
    return { ...this.props };
  }
}
