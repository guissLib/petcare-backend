import { User } from '../../../src/domain/entities/user.entity';

describe('User', () => {
  it('normalizes the email of a pet owner', () => {
    const user = User.create({
      id: 'user_1',
      name: 'Ana Pérez',
      email: ' ANA@EXAMPLE.COM ',
      role: 'pet-owner',
      passwordHash: 'scrypt$test$hash',
      city: 'Bogotá',
      createdAt: '2026-08-01T00:00:00.000Z',
    });

    expect(user.toPrimitives()).toMatchObject({
      name: 'Ana Pérez',
      email: 'ana@example.com',
      role: 'pet-owner',
      city: 'Bogotá',
    });
  });

  it('requires a city for provider and pet-owner roles', () => {
    expect(() =>
      User.create({
        id: 'user_1',
        name: 'Proveedor',
        email: 'provider@example.com',
        role: 'provider',
        passwordHash: 'scrypt$test$hash',
        createdAt: '2026-08-01T00:00:00.000Z',
      }),
    ).toThrow('city es requerido');
  });

  it('allows an administrator without a city', () => {
    const user = User.create({
      id: 'user_1',
      name: 'Administración',
      email: 'admin@example.com',
      role: 'administrator',
      passwordHash: 'scrypt$test$hash',
      createdAt: '2026-08-01T00:00:00.000Z',
    });

    expect(user.role).toBe('administrator');
  });
});
