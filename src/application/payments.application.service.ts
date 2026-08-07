import { Inject, Injectable } from '@nestjs/common';
import { BusinessRuleError } from '../domain/shared/errors/domain-error';
import { Payment } from '../domain/entities/payment.entity';
import { PAYMENT_REPOSITORY } from '../domain/repositories/payment.repository';
import type { PaymentRepository } from '../domain/repositories/payment.repository';
import type { PaymentMethod } from '../domain/shared/types';
import { PETCARE_PAYMENT_GATEWAY } from './ports/integration.ports';
import type { PaymentGateway } from './ports/integration.ports';
import {
  createId,
  numberValue,
  now,
  required,
  type Input,
} from './shared/application.utils';

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
    return this.charge(numberValue(input, 'amount'), method);
  }

  async charge(amount: number, method: PaymentMethod) {
    const result = await this.gateway.charge(amount, method);
    const payment = Payment.create({
      id: createId('payment'),
      method,
      amount,
      status: result.status,
      provider: result.provider,
      reference: result.reference,
      createdAt: now(),
    });
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
