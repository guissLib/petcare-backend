import { BusinessRuleError } from '../shared/errors/domain-error';

export class Email {
  private constructor(private readonly email: string) {}

  static create(value: string) {
    const normalized = value.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalized)) {
      throw new BusinessRuleError('email debe ser válido');
    }
    return new Email(normalized);
  }

  get value() {
    return this.email;
  }
}
