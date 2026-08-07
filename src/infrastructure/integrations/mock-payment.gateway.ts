import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  PaymentGateway,
  PaymentGatewayResult,
} from '../../application/ports/integration.ports';
import type { PaymentMethod } from '../../domain/shared/types';

@Injectable()
export class MockPaymentGateway implements PaymentGateway {
  charge(
    _amount: number,
    method: PaymentMethod,
  ): Promise<PaymentGatewayResult> {
    return Promise.resolve({
      status: method === 'online' ? 'paid' : 'pending',
      provider: 'mock',
      reference: `MOCK-${randomUUID().slice(0, 8).toUpperCase()}`,
    });
  }
}
