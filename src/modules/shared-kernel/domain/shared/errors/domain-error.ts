export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class BusinessRuleError extends DomainError {}

export class ConflictError extends DomainError {}

export class EntityNotFoundError extends DomainError {}

export class InvalidCredentialsError extends DomainError {}

export class AccessDeniedError extends DomainError {}
