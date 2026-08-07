import type { PaymentMethod } from '../../domain/shared/types';

export interface PaymentGatewayResult {
  status: 'paid' | 'pending' | 'failed';
  provider: 'mock';
  reference: string;
}

export interface PaymentGateway {
  charge(amount: number, method: PaymentMethod): Promise<PaymentGatewayResult>;
}

export const PETCARE_PAYMENT_GATEWAY = Symbol('PETCARE_PAYMENT_GATEWAY');

export interface MapGateway {
  geocode(
    address: string,
    city: string,
  ): Promise<{
    address: string;
    city: string;
    latitude: number;
    longitude: number;
    provider: string;
  }>;
}

export const PETCARE_MAP_GATEWAY = Symbol('PETCARE_MAP_GATEWAY');
