import { JwtService } from '@nestjs/jwt';
import { User } from '../../src/domain/entities/user.entity';
import { AuthApplicationService } from '../../src/application/auth.application.service';
import type { PasswordHasher } from '../../src/application/ports/password-hasher.port';
import type { ProviderRepository } from '../../src/domain/repositories/provider.repository';
import type { UserRepository } from '../../src/domain/repositories/user.repository';

describe('AuthApplicationService', () => {
  const user = User.create({
    id: 'user_123',
    name: 'Ana Pérez',
    email: 'ana@example.com',
    role: 'pet-owner',
    passwordHash: 'scrypt$hash',
    city: 'Bogotá',
    createdAt: '2026-08-06T00:00:00.000Z',
  });

  it('returns a JWT and public user data for valid credentials', async () => {
    const verifyMock = jest.fn().mockResolvedValue(true);
    const passwordHasher: PasswordHasher = {
      hash: jest.fn(),
      verify: verifyMock,
    };
    const users = {
      findByEmail: jest.fn().mockResolvedValue(user),
    } as unknown as UserRepository;
    const providers = {} as unknown as ProviderRepository;
    const jwt = new JwtService({ secret: 'test-secret' });
    const service = new AuthApplicationService(
      users,
      providers,
      passwordHasher,
      jwt,
    );

    const result = await service.login({
      email: 'ANA@example.com',
      password: 'UnaClaveSegura2026!',
    });

    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.user).toMatchObject({
      id: 'user_123',
      email: 'ana@example.com',
    });
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(verifyMock).toHaveBeenCalledWith(
      'UnaClaveSegura2026!',
      'scrypt$hash',
    );
  });

  it('rejects invalid credentials without revealing which field failed', async () => {
    const passwordHasher: PasswordHasher = {
      hash: jest.fn(),
      verify: jest.fn().mockResolvedValue(false),
    };
    const users = {
      findByEmail: jest.fn().mockResolvedValue(user),
    } as unknown as UserRepository;
    const providers = {} as unknown as ProviderRepository;
    const service = new AuthApplicationService(
      users,
      providers,
      passwordHasher,
      new JwtService({ secret: 'test-secret' }),
    );

    await expect(
      service.login({
        email: 'ana@example.com',
        password: 'ClaveIncorrecta2026!',
      }),
    ).rejects.toThrow('Credenciales inválidas');
  });
});
