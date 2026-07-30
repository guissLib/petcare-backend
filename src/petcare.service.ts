import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  Booking, BookingStatus, Notification, Pet, Payment, Promotion, Provider,
  ServiceType, User,
} from './petcare.types';
import { MysqlPersistenceService } from './mysql-persistence.service';

type Input = Record<string, any>;
const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}_${randomUUID()}`;
const required = (input: Input, fields: string[]) => {
  const missing = fields.filter((field) => input[field] === undefined || input[field] === '');
  if (missing.length) throw new BadRequestException(`Campos requeridos: ${missing.join(', ')}`);
};

@Injectable()
export class PetcareService implements OnModuleInit {
  constructor(private readonly persistence: MysqlPersistenceService) {}

  private readonly users: User[] = [];
  private readonly pets: Pet[] = [];
  private readonly providers: Provider[] = [
    {
      id: 'provider_centro', name: 'PetCare Centro', type: 'employee', city: 'Bogotá',
      address: 'Calle 100 # 12-30', latitude: 4.676, longitude: -74.048,
      capacity: 8, acceptsHomeVisits: true,
      services: ['grooming', 'veterinary', 'walking', 'home-visit'],
      schedule: [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({ dayOfWeek, start: '08:00', end: '18:00' })),
    },
    {
      id: 'provider_norte', name: 'PetCare Norte', type: 'franchise', city: 'Medellín',
      address: 'Carrera 43A # 10-20', latitude: 6.208, longitude: -75.567,
      capacity: 5, acceptsHomeVisits: false, services: ['grooming', 'boarding', 'veterinary'],
      schedule: [1, 2, 3, 4, 5].map((dayOfWeek) => ({ dayOfWeek, start: '09:00', end: '17:00' })),
    },
  ];
  private readonly promotions: Promotion[] = [
    {
      id: 'promo_nacional_10', name: 'Bienvenida PetCare', description: 'Descuento nacional',
      discountPercent: 10, scope: 'national', startsAt: '2020-01-01', endsAt: '2099-12-31',
      active: true,
    },
  ];
  private readonly bookings: Booking[] = [];
  private readonly notifications: Notification[] = [];

  async onModuleInit() {
    const state = await this.persistence.load();
    if (!state) return;
    this.users.push(...(state.users ?? []));
    this.pets.push(...(state.pets ?? []));
    this.bookings.push(...(state.bookings ?? []));
    this.notifications.push(...(state.notifications ?? []));
    if (state.promotions?.length) {
      this.promotions.splice(0, this.promotions.length, ...state.promotions);
    }
  }

  health() {
    return { service: 'petcare-home-services', status: 'ok', mode: 'in-memory-mock', timestamp: now() };
  }

  createUser(input: Input) {
    required(input, ['name', 'email', 'city']);
    if (this.users.some((user) => user.email.toLowerCase() === String(input.email).toLowerCase())) {
      throw new BadRequestException('El email ya está registrado');
    }
    const user: User = { id: id('user'), name: input.name, email: input.email, phone: input.phone, city: input.city, createdAt: now() };
    this.users.push(user);
    void this.persist();
    return user;
  }

  listUsers() { return this.users; }

  createPet(ownerId: string, input: Input) {
    this.getUser(ownerId);
    required(input, ['name', 'species']);
    const pet: Pet = {
      id: id('pet'), ownerId, name: input.name, species: input.species,
      breed: input.breed, weightKg: input.weightKg, specialHandling: input.specialHandling,
      vaccinationRecords: [],
    };
    this.pets.push(pet);
    void this.persist();
    return pet;
  }

  listPets(ownerId: string) { this.getUser(ownerId); return this.pets.filter((pet) => pet.ownerId === ownerId); }

  addVaccination(petId: string, input: Input) {
    const pet = this.getPet(petId);
    required(input, ['vaccine', 'administeredAt']);
    pet.vaccinationRecords.push({
      id: id('vax'), vaccine: input.vaccine, administeredAt: input.administeredAt,
      expiresAt: input.expiresAt, documentUrl: input.documentUrl,
    });
    void this.persist();
    return pet;
  }

  listProviders(query: Input) {
    return this.providers.filter((provider) =>
      (!query.city || provider.city.toLowerCase() === String(query.city).toLowerCase()) &&
      (!query.serviceType || provider.services.includes(query.serviceType)));
  }

  getProvider(providerId: string) {
    const provider = this.providers.find((item) => item.id === providerId);
    if (!provider) throw new NotFoundException('Proveedor no encontrado');
    return provider;
  }

  availability(providerId: string, query: Input) {
    const provider = this.getProvider(providerId);
    required(query, ['date']);
    const date = new Date(query.date);
    if (Number.isNaN(date.getTime())) throw new BadRequestException('date debe ser una fecha válida');
    const dayOfWeek = date.getDay() || 7;
    const schedule = provider.schedule.find((item) => item.dayOfWeek === dayOfWeek);
    if (!schedule) return { providerId, date: query.date, available: false, slots: [] };
    const booked = this.bookings.filter((booking) =>
      booking.providerId === providerId && booking.scheduledAt.startsWith(String(query.date)) &&
      !['rejected', 'cancelled'].includes(booking.status)).length;
    return {
      providerId, date: query.date, available: booked < provider.capacity,
      capacity: provider.capacity, booked, slots: booked < provider.capacity
        ? [{ start: schedule.start, end: schedule.end, remaining: provider.capacity - booked }] : [],
    };
  }

  listPromotions(query: Input) {
    const date = new Date();
    return this.promotions.filter((promo) =>
      promo.active && new Date(promo.startsAt) <= date && new Date(promo.endsAt) >= date &&
      (!query.city || promo.scope === 'national' || promo.city?.toLowerCase() === String(query.city).toLowerCase()) &&
      (!query.providerId || promo.scope === 'national' || promo.providerId === query.providerId));
  }

  createPromotion(input: Input) {
    required(input, ['name', 'description', 'discountPercent', 'scope', 'startsAt', 'endsAt']);
    if (input.scope === 'local' && !input.city && !input.providerId) {
      throw new BadRequestException('Una promoción local requiere city o providerId');
    }
    const promotion: Promotion = {
      id: id('promo'), name: input.name, description: input.description,
      discountPercent: Number(input.discountPercent), scope: input.scope,
      city: input.city, providerId: input.providerId, serviceTypes: input.serviceTypes,
      startsAt: input.startsAt, endsAt: input.endsAt, active: input.active ?? true,
    };
    this.promotions.push(promotion);
    void this.persist();
    return promotion;
  }

  geocode(input: Input) {
    required(input, ['address', 'city']);
    // Mock determinístico: no realiza llamadas a Google Maps, Mapbox ni otro proveedor.
    const seed = [...`${input.address}${input.city}`].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return { address: input.address, city: input.city, latitude: 4.5 + (seed % 100) / 1000, longitude: -74.1 + (seed % 100) / 1000, provider: 'mock-map' };
  }

  createBooking(userId: string, input: Input) {
    this.getUser(userId);
    required(input, ['petId', 'providerId', 'serviceType', 'visitMode', 'scheduledAt', 'paymentMethod']);
    const pet = this.getPet(input.petId);
    if (pet.ownerId !== userId) throw new BadRequestException('La mascota no pertenece al usuario');
    const provider = this.getProvider(input.providerId);
    if (!provider.services.includes(input.serviceType)) throw new BadRequestException('El proveedor no ofrece ese servicio');
    if (input.visitMode === 'home-visit' && !provider.acceptsHomeVisits) throw new BadRequestException('El proveedor no ofrece visitas a domicilio');
    if (input.visitMode === 'home-visit' && !input.address) throw new BadRequestException('address es requerido para visita a domicilio');
    const availability = this.availability(provider.id, { date: String(input.scheduledAt).slice(0, 10) });
    if (!availability.available) throw new BadRequestException('No hay disponibilidad para la fecha seleccionada');
    const needsVaccination = ['veterinary', 'boarding'].includes(input.serviceType);
    if (needsVaccination && !pet.vaccinationRecords.some((record) => !record.expiresAt || new Date(record.expiresAt) >= new Date())) {
      throw new BadRequestException('La mascota requiere una vacuna vigente para este servicio');
    }
    const baseTotal = Number(input.total ?? 50000);
    if (!Number.isFinite(baseTotal) || baseTotal <= 0) throw new BadRequestException('total debe ser positivo');
    const promotion = this.listPromotions({ city: this.getUser(userId).city, providerId: provider.id })
      .find((promo) => !promo.serviceTypes || promo.serviceTypes.includes(input.serviceType));
    const total = Math.round(baseTotal * (1 - (promotion?.discountPercent ?? 0) / 100));
    const payment: Payment = {
      id: id('payment'), method: input.paymentMethod, status: input.paymentMethod === 'online' ? 'paid' : 'pending',
      amount: total, provider: 'mock', reference: `MOCK-${randomUUID().slice(0, 8).toUpperCase()}`,
    };
    const booking: Booking = {
      id: id('booking'), userId, petId: input.petId, providerId: provider.id,
      serviceType: input.serviceType, visitMode: input.visitMode, scheduledAt: input.scheduledAt,
      address: input.address, notes: input.notes, status: 'confirmed', total, payment,
      paymentMethod: input.paymentMethod, promotionId: promotion?.id, createdAt: now(),
    };
    this.bookings.push(booking);
    this.notify(userId, booking, 'confirmation', `Reserva ${booking.id} confirmada`);
    void this.persist();
    return booking;
  }

  listBookings(query: Input) {
    return this.bookings.filter((booking) => (!query.userId || booking.userId === query.userId) &&
      (!query.providerId || booking.providerId === query.providerId) &&
      (!query.status || booking.status === query.status));
  }

  getBooking(bookingId: string) {
    const booking = this.bookings.find((item) => item.id === bookingId);
    if (!booking) throw new NotFoundException('Reserva no encontrada');
    return booking;
  }

  updateBookingStatus(bookingId: string, input: Input) {
    const booking = this.getBooking(bookingId);
    required(input, ['status']);
    const allowed: BookingStatus[] = ['confirmed', 'rejected', 'in-progress', 'completed', 'cancelled'];
    if (!allowed.includes(input.status)) throw new BadRequestException(`status debe ser uno de: ${allowed.join(', ')}`);
    booking.status = input.status;
    if (input.status === 'rejected') {
      booking.rejectionReason = input.reason ?? 'Requisitos no cumplidos';
      this.notify(booking.userId, booking, 'rejection', `Reserva rechazada: ${booking.rejectionReason}`);
    } else if (input.status === 'completed') {
      this.notify(booking.userId, booking, 'completion', `Reserva ${booking.id} completada`);
    }
    void this.persist();
    return booking;
  }

  listNotifications(userId: string) { this.getUser(userId); return this.notifications.filter((item) => item.userId === userId); }

  sendReminder(bookingId: string) {
    const booking = this.getBooking(bookingId);
    if (['cancelled', 'rejected', 'completed'].includes(booking.status)) {
      throw new BadRequestException('No se puede recordar una reserva finalizada o cancelada');
    }
    this.notify(booking.userId, booking, 'reminder', `Recordatorio: tienes una reserva el ${booking.scheduledAt}`);
    void this.persist();
    return this.notifications[this.notifications.length - 1];
  }

  mockPayment(input: Input) {
    required(input, ['amount', 'method']);
    return { id: id('payment'), amount: input.amount, method: input.method, status: input.method === 'online' ? 'paid' : 'pending', provider: 'mock', reference: `MOCK-${randomUUID().slice(0, 8).toUpperCase()}` };
  }

  private notify(userId: string, booking: Booking, type: Notification['type'], message: string) {
    this.notifications.push({ id: id('notification'), userId, bookingId: booking.id, type, message, channel: 'mock-push', sentAt: now(), read: false });
  }
  private persist() {
    return this.persistence.save({
      users: this.users, pets: this.pets, bookings: this.bookings,
      promotions: this.promotions, notifications: this.notifications,
    }).catch(() => undefined);
  }
  private getUser(userId: string) {
    const user = this.users.find((item) => item.id === userId);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }
  private getPet(petId: string) {
    const pet = this.pets.find((item) => item.id === petId);
    if (!pet) throw new NotFoundException('Mascota no encontrada');
    return pet;
  }
}
