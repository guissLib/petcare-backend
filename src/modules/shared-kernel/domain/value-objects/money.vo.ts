import { BusinessRuleError } from '../shared/errors/domain-error';

export class Money {
  private constructor(
    readonly amount: number,
    readonly currency: string,
  ) {}

  static cop(amount: number) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BusinessRuleError('El valor debe ser positivo');
    }
    return new Money(Math.round(amount), 'COP');
  }

  applyDiscount(percent: number) {
    if (percent < 0 || percent > 100) {
      throw new BusinessRuleError('El descuento debe estar entre 0 y 100');
    }
    return new Money(
      Math.round(this.amount * (1 - percent / 100)),
      this.currency,
    );
  }

  applyFixedDiscount(discount: number) {
    if (!Number.isFinite(discount) || discount < 0) {
      throw new BusinessRuleError('El descuento fijo no puede ser negativo');
    }
    return new Money(
      Math.max(0, this.amount - Math.round(discount)),
      this.currency,
    );
  }
}
