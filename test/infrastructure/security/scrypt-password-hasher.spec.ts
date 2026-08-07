import {
  hashWithScrypt,
  verifyWithScrypt,
} from '../../../src/infrastructure/security/scrypt-password-hasher';

describe('scrypt password hashing', () => {
  it('returns a salted hash without exposing the password', async () => {
    const password = 'UnaClaveSegura2026!';
    const hash = await hashWithScrypt(password);

    expect(hash).toMatch(/^scrypt\$16384\$8\$1\$/);
    expect(hash).not.toContain(password);
  });

  it('generates a different salt for the same password', async () => {
    const first = await hashWithScrypt('UnaClaveSegura2026!');
    const second = await hashWithScrypt('UnaClaveSegura2026!');

    expect(first).not.toBe(second);
  });

  it('verifies a correct password and rejects an incorrect one', async () => {
    const password = 'UnaClaveSegura2026!';
    const hash = await hashWithScrypt(password);

    await expect(verifyWithScrypt(password, hash)).resolves.toBe(true);
    await expect(verifyWithScrypt('OtraClaveSegura2026!', hash)).resolves.toBe(
      false,
    );
  });
});
