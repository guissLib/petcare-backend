import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '../domain/entities/user.entity';
import { InvalidCredentialsError } from '../../shared-kernel/domain/shared/errors/domain-error';
import { PROVIDER_REPOSITORY } from '../../provider/domain/repositories/provider.repository';
import type { ProviderRepository } from '../../provider/domain/repositories/provider.repository';
import { USER_REPOSITORY } from '../domain/repositories/user.repository';
import type { UserRepository } from '../domain/repositories/user.repository';
import { PASSWORD_HASHER } from './ports/password-hasher.port';
import type { PasswordHasher } from './ports/password-hasher.port';
import {
  required,
  text,
  type Input,
} from '../../shared-kernel/application/shared/application.utils';

@Injectable()
export class AuthApplicationService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
    @Inject(PROVIDER_REPOSITORY)
    private readonly providers: ProviderRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
    private readonly jwt: JwtService,
  ) {}

  async login(input: Input) {
    required(input, ['email', 'password']);
    const email = text(input, 'email').toLowerCase();
    const password = text(input, 'password');
    const user = await this.users.findByEmail(email);

    if (
      !user ||
      !(await this.passwordHasher.verify(
        password,
        user.toPrimitives().passwordHash,
      ))
    ) {
      throw new InvalidCredentialsError('Credenciales inválidas');
    }

    const provider =
      user.role === 'provider'
        ? (await this.providers.findAll()).find(
            (candidate) => candidate.toPrimitives().operatorUserId === user.id,
          )
        : undefined;
    const providerId = provider?.id;
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
      ...(user.toPrimitives().city ? { city: user.toPrimitives().city } : {}),
      ...(providerId ? { providerId } : {}),
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: Number(process.env.AUTH_JWT_EXPIRES_IN_SECONDS ?? 3600),
      user: {
        ...publicUser(user),
        ...(provider ? { provider: provider.toPrimitives() } : {}),
      },
    };
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
