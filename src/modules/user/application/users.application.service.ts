import { Inject, Injectable } from '@nestjs/common';
import {
  BusinessRuleError,
  ConflictError,
} from '../../shared-kernel/domain/shared/errors/domain-error';
import { User } from '../domain/entities/user.entity';
import type { UserRepository } from '../domain/repositories/user.repository';
import { Provider } from '../../provider/domain/entities/provider.entity';
import type { ProviderRepository } from '../../provider/domain/repositories/provider.repository';
import type {
  ProviderType,
  ServiceType,
  UserRole,
} from '../../shared-kernel/domain/shared/types';
import { PROVIDER_REPOSITORY } from '../../provider/domain/repositories/provider.repository';
import { USER_REPOSITORY } from '../domain/repositories/user.repository';
import { PASSWORD_HASHER } from './ports/password-hasher.port';
import type { PasswordHasher } from './ports/password-hasher.port';
import {
  createId,
  now,
  required,
  text,
  stringArray,
  type Input,
} from '../../shared-kernel/application/shared/application.utils';

@Injectable()
export class UsersApplicationService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
    @Inject(PROVIDER_REPOSITORY)
    private readonly providers: ProviderRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async create(input: Input) {
    required(input, ['name', 'email', 'password']);
    const role = readRole(input.role ?? 'pet-owner');
    const city = text(input, 'city') || undefined;
    const password = text(input, 'password');
    if (password.length < 12) {
      throw new BusinessRuleError('password debe tener al menos 12 caracteres');
    }

    if (role !== 'administrator' && !city) {
      throw new BusinessRuleError('city es requerido para este rol');
    }
    if (await this.users.findByEmail(text(input, 'email'))) {
      throw new ConflictError('El email ya está registrado');
    }

    const user = User.create({
      id: createId('user'),
      name: text(input, 'name'),
      email: text(input, 'email'),
      role,
      passwordHash: await this.passwordHasher.hash(password),
      city,
      phone: text(input, 'phone') || undefined,
      createdAt: now(),
    });

    let provider: Provider | undefined;
    if (role === 'provider') {
      const profile = nestedInput(input.provider) ?? input;
      required(profile, ['type', 'address', 'services']);
      provider = Provider.create({
        id: createId('provider'),
        operatorUserId: user.id,
        name: text(profile, 'name') || user.toPrimitives().name,
        type: readProviderType(profile.type),
        city: city ?? '',
        address: text(profile, 'address'),
        latitude: optionalNumber(profile, 'latitude'),
        longitude: optionalNumber(profile, 'longitude'),
        capacity: optionalNumber(profile, 'capacity'),
        acceptsHomeVisits: profile.acceptsHomeVisits === true,
        services: readServices(stringArray(profile, 'services')),
      });
    }

    await this.users.save(user);
    if (provider) {
      await this.providers.save(provider);
    }

    return {
      ...publicUser(user),
      ...(provider ? { provider: provider.toPrimitives() } : {}),
    };
  }

  async list() {
    const users = await this.users.findAll();
    return users.map((user) => publicUser(user));
  }
}

function publicUser(user: User) {
  const data = user.toPrimitives();
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    role: data.role,
    city: data.city,
    phone: data.phone,
    createdAt: data.createdAt,
  };
}

function readRole(value: unknown): UserRole {
  if (
    value === 'pet-owner' ||
    value === 'provider' ||
    value === 'administrator'
  ) {
    return value;
  }
  throw new BusinessRuleError(
    'role debe ser pet-owner, provider o administrator',
  );
}

function nestedInput(value: unknown): Input | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Input)
    : undefined;
}

function optionalNumber(input: Input, field: string) {
  const value = input[field];
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

function readProviderType(value: unknown): ProviderType {
  if (value === 'employee' || value === 'contractor' || value === 'franchise') {
    return value;
  }
  throw new BusinessRuleError('type debe ser employee, contractor o franchise');
}

function readServices(values: string[]): ServiceType[] {
  const allowed: ServiceType[] = [
    'grooming',
    'walking',
    'boarding',
    'veterinary',
    'home-visit',
    'cleaning',
  ];
  if (
    values.length === 0 ||
    values.some((value) => !allowed.includes(value as ServiceType))
  ) {
    throw new BusinessRuleError(
      'services debe contener al menos un servicio válido',
    );
  }
  return values as ServiceType[];
}
