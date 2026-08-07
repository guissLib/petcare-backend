import { BusinessRuleError } from '../shared/errors/domain-error';
import { Money } from '../value-objects/money.vo';
import type {
  PaymentMethod,
  PaymentPrimitives,
  PaymentStatus,
} from '../shared/types';
import type { DomainEvent } from '../events/domain-event';
import { PaymentCreatedDomainEvent } from '../events/payment-created.domain-event';

export interface NewPaymentProps {
  id: string;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  provider: 'mock';
  reference: string;
  createdAt: string;
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
    });
    payment.domainEvents.push(
      new PaymentCreatedDomainEvent(payment.id, payment.amount, payment.method),
    );
    return payment;
  }

  static rehydrate(props: PaymentPrimitives) {
    return new Payment(props);
  }

  pullDomainEvents() {
    const events = [...this.domainEvents];
    this.domainEvents.length = 0;
    return events;
  }

  get id() {
    return this.props.id;
  }

  get method() {
    return this.props.method;
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
