import { BookingPolicy } from '../../../src/modules/booking/domain/services/booking-policy.service';
import { Pet } from '../../../src/modules/pet/domain/entities/pet.entity';
import { Provider } from '../../../src/modules/provider/domain/entities/provider.entity';

const availability = {
  available: true,
  capacity: 5,
  booked: 0,
  slots: [],
};

describe('BookingPolicy vaccination rule', () => {
  it('blocks grooming, boarding and cleaning without a PDF carnet', () => {
    const policy = new BookingPolicy();
    const pet = Pet.create({
      id: 'pet_1',
      ownerId: 'user_1',
      name: 'Luna',
      species: 'dog',
    });
    const provider = Provider.create({
      id: 'provider_1',
      name: 'PetCare',
      type: 'employee',
      city: 'La Paz',
      address: 'Calle 1',
      services: ['grooming', 'boarding', 'cleaning'],
    });

    for (const serviceType of ['grooming', 'boarding', 'cleaning'] as const) {
      expect(() =>
        policy.validate(
          pet,
          provider,
          serviceType,
          'at-location',
          availability,
        ),
      ).toThrow(
        'Para este servicio es obligatorio adjuntar el carnet de vacunación.',
      );
    }
  });
});
