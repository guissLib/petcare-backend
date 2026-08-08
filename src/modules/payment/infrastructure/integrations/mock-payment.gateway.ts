import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  MockPaymentCard,
  PaymentGateway,
  PaymentGatewayResult,
} from '../../../shared-kernel/application/ports/integration.ports';
import type { PaymentMethod } from '../../../shared-kernel/domain/shared/types';

@Injectable()
export class MockPaymentGateway implements PaymentGateway {
  charge(
    _amount: number,
    method: PaymentMethod,
    card?: MockPaymentCard,
  ): Promise<PaymentGatewayResult> {
    if (
      method === 'online' &&
      card?.cardNumber.replace(/\s/g, '').endsWith('0002')
    ) {
      return Promise.resolve({
        status: 'failed',
        provider: 'mock',
        reference: `MOCK-FAILED-${randomUUID().slice(0, 8).toUpperCase()}`,
        failureReason: 'La tarjeta mock fue rechazada',
      });
    }
    return Promise.resolve({
      status: method === 'online' ? 'paid' : 'pending',
      provider: 'mock',
      reference: `MOCK-${randomUUID().slice(0, 8).toUpperCase()}`,
    });
  }
}
