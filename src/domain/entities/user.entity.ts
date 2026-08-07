import { BusinessRuleError } from '../shared/errors/domain-error';
import { Email } from '../value-objects/email.vo';
import type { UserPrimitives, UserRole } from '../shared/types';

export interface NewUserProps {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  passwordHash: string;
  city?: string;
  phone?: string;
  createdAt: string;
}

export class User {
  private constructor(private readonly props: UserPrimitives) {}

  static create(input: NewUserProps) {
    if (!input.name?.trim()) {
      throw new BusinessRuleError('name es requerido');
    }
    if (
      input.role !== 'pet-owner' &&
      input.role !== 'provider' &&
      input.role !== 'administrator'
    ) {
      throw new BusinessRuleError('role no es válido');
    }
    if (input.role !== 'administrator' && !input.city?.trim()) {
      throw new BusinessRuleError('city es requerido para este rol');
    }
    if (!input.passwordHash?.trim()) {
      throw new BusinessRuleError('passwordHash es requerido');
    }

    const email = Email.create(input.email);
    return new User({
      ...input,
      name: input.name.trim(),
      email: email.value,
      city: input.city?.trim(),
    });
  }

  static rehydrate(props: UserPrimitives) {
    return new User(props);
  }

  get id() {
    return this.props.id;
  }

  get email() {
    return this.props.email;
  }

  get role() {
    return this.props.role;
  }

  toPrimitives() {
    return { ...this.props };
  }
}
