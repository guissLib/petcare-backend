import { Injectable } from '@nestjs/common';
import { createId, Input, stringValue, required } from '../shared/input';
import { Payment, PaymentMethod } from '../shared/petcare.types';

@Injectable()
export class PaymentsDomainService {
  mockPayment(input: Input) {
    required(input, ['amount', 'method']);
    const method = stringValue(input, 'method') as PaymentMethod;
    return {
      id: createId('payment'),
      amount: Number(input.amount),
      method,
      status: method === 'online' ? 'paid' : 'pending',
      provider: 'mock',
      reference: `MOCK-${createId('').slice(1, 9).toUpperCase()}`,
    };
  }

  createBookingPayment(amount: number, method: PaymentMethod): Payment {
    return {
      id: createId('payment'),
      method,
      status: method === 'online' ? 'paid' : 'pending',
      amount,
      provider: 'mock',
      reference: `MOCK-${createId('').slice(1, 9).toUpperCase()}`,
    };
  }
}
