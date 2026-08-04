import { Inject, Injectable } from '@nestjs/common';
import { PETCARE_EVENT_BUS } from './ports/event-bus.port';
import type { PetcareEventBus } from './ports/event-bus.port';
import { BookingsDomainService } from '../domains/bookings/bookings.domain.service';
import { MapsDomainService } from '../domains/maps/maps.domain.service';
import { NotificationsDomainService } from '../domains/notifications/notifications.domain.service';
import { PaymentsDomainService } from '../domains/payments/payments.domain.service';
import { PetsDomainService } from '../domains/pets/pets.domain.service';
import { ProvidersDomainService } from '../domains/providers/providers.domain.service';
import { PromotionsDomainService } from '../domains/promotions/promotions.domain.service';
import { Input, now } from '../domains/shared/input';
import { UsersDomainService } from '../domains/users/users.domain.service';
import { PetcareStoreService } from './petcare-store.service';

@Injectable()
export class PetcareApplicationService {
  constructor(
    private readonly store: PetcareStoreService,
    private readonly users: UsersDomainService,
    private readonly pets: PetsDomainService,
    private readonly providers: ProvidersDomainService,
    private readonly promotions: PromotionsDomainService,
    private readonly bookings: BookingsDomainService,
    private readonly notifications: NotificationsDomainService,
    private readonly payments: PaymentsDomainService,
    private readonly maps: MapsDomainService,
    @Inject(PETCARE_EVENT_BUS)
    private readonly eventBus: PetcareEventBus,
  ) {}

  health() {
    return {
      service: 'petcare-home-services',
      status: 'ok',
      mode: this.store.persistenceMode,
      eventBus: this.eventBus.isAvailable() ? 'cloudamqp' : 'in-memory',
      timestamp: now(),
    };
  }

  createUser(input: Input) {
    return this.users.create(input);
  }

  loginWithEmail(input: Input) {
    return this.users.loginWithEmail(input);
  }

  listUsers() {
    return this.users.list();
  }

  createPet(ownerId: string, input: Input) {
    return this.pets.create(ownerId, input);
  }

  listPets(ownerId: string) {
    return this.pets.listByOwner(ownerId);
  }

  addVaccination(petId: string, input: Input) {
    return this.pets.addVaccination(petId, input);
  }

  listProviders(query: Input) {
    return this.providers.list(query);
  }

  getProvider(providerId: string) {
    return this.providers.getById(providerId);
  }

  availability(providerId: string, query: Input) {
    return this.providers.availability(providerId, query);
  }

  listPromotions(query: Input) {
    return this.promotions.list(query);
  }

  createPromotion(input: Input) {
    return this.promotions.create(input);
  }

  geocode(input: Input) {
    return this.maps.geocode(input);
  }

  async createBooking(userId: string, input: Input) {
    return this.payments.requestPayment({
      ...input,
      userId,
      amount: input.amount ?? input.total ?? 50000,
      method: input.method ?? input.paymentMethod ?? 'online',
    });
  }

  listBookings(query: Input) {
    return this.bookings.list(query);
  }

  getBooking(bookingId: string) {
    return this.bookings.getById(bookingId);
  }

  updateBookingStatus(bookingId: string, input: Input) {
    return this.bookings.updateStatus(bookingId, input);
  }

  sendReminder(bookingId: string) {
    return this.bookings.sendReminder(bookingId);
  }

  listNotifications(userId: string) {
    return this.notifications.listByUser(userId);
  }

  createPayment(input: Input) {
    return this.payments.requestPayment(input);
  }

  mockPayment(input: Input) {
    return this.payments.mockPayment(input);
  }
}
