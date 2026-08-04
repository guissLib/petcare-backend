import {
  Booking,
  Notification,
  Payment,
  Pet,
  Promotion,
  User,
} from './petcare.types';

export interface PetcareState {
  users: User[];
  pets: Pet[];
  bookings: Booking[];
  payments: Payment[];
  promotions: Promotion[];
  notifications: Notification[];
}

export const createInitialState = (): PetcareState => ({
  users: [],
  pets: [],
  bookings: [],
  payments: [],
  promotions: [
    {
      id: 'promo_nacional_10',
      name: 'Bienvenida PetCare',
      description: 'Descuento nacional',
      discountPercent: 10,
      scope: 'national',
      startsAt: '2020-01-01',
      endsAt: '2099-12-31',
      active: true,
    },
  ],
  notifications: [],
});
