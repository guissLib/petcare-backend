import { Pet } from '../../../src/modules/pet/domain/entities/pet.entity';

describe('Pet vaccination documents', () => {
  it('counts only a current PDF carnet as valid vaccination', () => {
    const pet = Pet.create({
      id: 'pet_1',
      ownerId: 'user_1',
      name: 'Luna',
      species: 'dog',
    });
    pet.addVaccination({
      id: 'vax_1',
      vaccine: 'Rabia',
      administeredAt: '2026-01-01T00:00:00.000Z',
      expiresAt: '2026-12-31T00:00:00.000Z',
      documentMimeType: 'application/pdf',
      documentName: 'carnet.pdf',
      documentSize: 100,
    });

    expect(
      pet.hasCurrentVaccination(new Date('2026-06-01T00:00:00.000Z')),
    ).toBe(true);
    expect(
      pet.hasCurrentVaccination(new Date('2027-01-01T00:00:00.000Z')),
    ).toBe(false);
  });

  it('rejects non-PDF vaccination documents', () => {
    const pet = Pet.create({
      id: 'pet_1',
      ownerId: 'user_1',
      name: 'Luna',
      species: 'dog',
    });

    expect(() =>
      pet.addVaccination({
        id: 'vax_1',
        vaccine: 'Rabia',
        administeredAt: '2026-01-01T00:00:00.000Z',
        documentMimeType: 'image/png',
      }),
    ).toThrow('formato PDF');
  });
});
