import {
  BusinessRuleError,
  EntityNotFoundError,
} from '../domain/shared/errors/domain-error';
import { Inject, Injectable } from '@nestjs/common';
import { Booking } from '../domain/entities/booking.entity';
import { Notification } from '../domain/entities/notification.entity';
import { BookingPolicy } from '../domain/services/booking-policy.service';
import { ProviderAvailabilityService } from '../domain/services/provider-availability.service';
import { BOOKING_REPOSITORY } from '../domain/repositories/booking.repository';
import type { BookingRepository } from '../domain/repositories/booking.repository';
import { NOTIFICATION_REPOSITORY } from '../domain/repositories/notification.repository';
import type { NotificationRepository } from '../domain/repositories/notification.repository';
import { PET_REPOSITORY } from '../domain/repositories/pet.repository';
import type { PetRepository } from '../domain/repositories/pet.repository';
import { PROVIDER_REPOSITORY } from '../domain/repositories/provider.repository';
import type { ProviderRepository } from '../domain/repositories/provider.repository';
import type {
  BookingStatus,
  PaymentMethod,
  ServiceType,
} from '../domain/shared/types';
import { Money } from '../domain/value-objects/money.vo';
import { USER_REPOSITORY } from '../domain/repositories/user.repository';
import type { UserRepository } from '../domain/repositories/user.repository';
import { PAYMENT_REPOSITORY } from '../domain/repositories/payment.repository';
import type { PaymentRepository } from '../domain/repositories/payment.repository';
import { PaymentsApplicationService } from './payments.application.service';
import {
  createId,
  numberValue,
  now,
  optionalText,
  required,
  text,
  type Input,
} from './shared/application.utils';
import { PROMOTION_REPOSITORY } from '../domain/repositories/promotion.repository';
import type { PromotionRepository } from '../domain/repositories/promotion.repository';

@Injectable()
export class BookingsApplicationService {
  private readonly availabilityService = new ProviderAvailabilityService();
  private readonly bookingPolicy = new BookingPolicy();

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
    @Inject(PET_REPOSITORY)
    private readonly pets: PetRepository,
    @Inject(PROVIDER_REPOSITORY)
    private readonly providers: ProviderRepository,
    @Inject(BOOKING_REPOSITORY)
    private readonly bookings: BookingRepository,
    @Inject(PAYMENT_REPOSITORY)
    private readonly payments: PaymentRepository,
    @Inject(PROMOTION_REPOSITORY)
    private readonly promotions: PromotionRepository,
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: NotificationRepository,
    private readonly paymentService: PaymentsApplicationService,
  ) {}

  async create(userId: string, input: Input) {
    required(input, [
      'petId',
      'providerId',
      'serviceType',
      'visitMode',
      'scheduledAt',
      'paymentMethod',
    ]);

    const user = await this.getUser(userId);
    const pet = await this.getPet(text(input, 'petId'));
    if (pet.ownerId !== userId) {
      throw new BusinessRuleError('La mascota no pertenece al usuario');
    }
    const provider = await this.getProvider(text(input, 'providerId'));
    const serviceType = readServiceType(input.serviceType);
    const visitMode = readVisitMode(input.visitMode);
    const scheduledAt = text(input, 'scheduledAt');
    const availability = this.availabilityService.calculate(
      provider,
      scheduledAt,
      await this.bookings.findAll(),
    );
    this.bookingPolicy.validate(
      pet,
      provider,
      serviceType,
      visitMode,
      availability,
    );

    const baseTotal = numberValue(input, 'total', 50000);
    const promotion = (await this.promotions.findAll()).find((candidate) =>
      candidate.appliesTo(
        user.toPrimitives().city ?? provider.toPrimitives().city,
        provider.id,
        serviceType,
        new Date(scheduledAt),
      ),
    );
    const total = Money.cop(baseTotal).applyDiscount(
      promotion?.discountPercent ?? 0,
    ).amount;
    const paymentMethod = readPaymentMethod(input.paymentMethod);
    const payment = input.paymentId
      ? await this.getPayment(text(input, 'paymentId'))
      : await this.paymentService.charge(total, paymentMethod);

    if (payment.status === 'failed') {
      throw new BusinessRuleError('El pago no fue aprobado');
    }
    if (payment.amount !== total) {
      throw new BusinessRuleError(
        'El valor del pago no coincide con el total de la reserva',
      );
    }
    const existing = await this.bookings.findByPaymentId(payment.id);
    if (existing) {
      return this.response(existing);
    }

    const booking = Booking.create({
      id: createId('booking'),
      userId,
      petId: pet.id,
      providerId: provider.id,
      serviceType,
      visitMode,
      scheduledAt,
      address: optionalText(input, 'address'),
      notes: optionalText(input, 'notes'),
      total,
      paymentMethod,
      paymentId: payment.id,
      promotionId: promotion?.id,
      createdAt: now(),
    });
    await this.bookings.save(booking);
    await this.notify(
      userId,
      booking.id,
      'confirmation',
      `Reserva ${booking.id} confirmada`,
    );
    return this.response(booking);
  }

  async list(query: Input) {
    const bookings = await this.bookings.findAll();
    const filtered = bookings.filter(
      (booking) =>
        (!query.userId ||
          booking.toPrimitives().userId === text(query, 'userId')) &&
        (!query.providerId ||
          booking.toPrimitives().providerId === text(query, 'providerId')) &&
        (!query.status || booking.status === query.status) &&
        (!query.paymentId ||
          booking.toPrimitives().paymentId === text(query, 'paymentId')),
    );
    return Promise.all(filtered.map((booking) => this.response(booking)));
  }

  async getById(bookingId: string) {
    const booking = await this.getBooking(bookingId);
    return this.response(booking);
  }

  async updateStatus(bookingId: string, input: Input) {
    const booking = await this.getBooking(bookingId);
    required(input, ['status']);
    const status = readBookingStatus(input.status);
    booking.changeStatus(status, optionalText(input, 'reason'));
    await this.bookings.save(booking);

    if (status === 'rejected') {
      await this.notify(
        booking.userId,
        booking.id,
        'rejection',
        `Reserva rechazada: ${booking.toPrimitives().rejectionReason}`,
      );
    }
    if (status === 'completed') {
      await this.notify(
        booking.userId,
        booking.id,
        'completion',
        `Reserva ${booking.id} completada`,
      );
    }
    return this.response(booking);
  }

  async sendReminder(bookingId: string) {
    const booking = await this.getBooking(bookingId);
    if (!booking.canReceiveReminder()) {
      throw new BusinessRuleError(
        'No se puede recordar una reserva finalizada o cancelada',
      );
    }
    return this.notify(
      booking.userId,
      booking.id,
      'reminder',
      `Recordatorio: tienes una reserva el ${booking.scheduledAt}`,
    );
  }

  private async response(booking: Booking) {
    const payment = await this.getPayment(booking.toPrimitives().paymentId);
    return {
      ...booking.toPrimitives(),
      payment: payment.toPrimitives(),
    };
  }

  private async notify(
    userId: string,
    bookingId: string,
    type: 'confirmation' | 'reminder' | 'completion' | 'rejection',
    message: string,
  ) {
    const notification = Notification.create({
      id: createId('notification'),
      userId,
      bookingId,
      type,
      message,
      sentAt: now(),
    });
    await this.notifications.save(notification);
    return notification.toPrimitives();
  }

  private async getUser(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new EntityNotFoundError('Usuario no encontrado');
    }
    return user;
  }

  private async getPet(petId: string) {
    const pet = await this.pets.findById(petId);
    if (!pet) {
      throw new EntityNotFoundError('Mascota no encontrada');
    }
    return pet;
  }

  private async getProvider(providerId: string) {
    const provider = await this.providers.findById(providerId);
    if (!provider) {
      throw new EntityNotFoundError('Proveedor no encontrado');
    }
    return provider;
  }

  private async getBooking(bookingId: string) {
    const booking = await this.bookings.findById(bookingId);
    if (!booking) {
      throw new EntityNotFoundError('Reserva no encontrada');
    }
    return booking;
  }

  private async getPayment(paymentId: string) {
    const payment = await this.payments.findById(paymentId);
    if (!payment) {
      throw new EntityNotFoundError('Pago no encontrado');
    }
    return payment;
  }
}

function readPaymentMethod(value: unknown): PaymentMethod {
  if (value === 'online' || value === 'at-location') {
    return value;
  }
  throw new BusinessRuleError('paymentMethod debe ser online o at-location');
}

function readServiceType(value: unknown): ServiceType {
  if (
    value === 'grooming' ||
    value === 'walking' ||
    value === 'boarding' ||
    value === 'veterinary' ||
    value === 'home-visit'
  ) {
    return value;
  }
  throw new BusinessRuleError('serviceType no es válido');
}

function readVisitMode(
  value: unknown,
): 'pickup-dropoff' | 'home-visit' | 'at-location' {
  if (
    value === 'pickup-dropoff' ||
    value === 'home-visit' ||
    value === 'at-location'
  ) {
    return value;
  }
  throw new BusinessRuleError('visitMode no es válido');
}

function readBookingStatus(value: unknown): BookingStatus {
  if (
    value === 'pending' ||
    value === 'confirmed' ||
    value === 'rejected' ||
    value === 'in-progress' ||
    value === 'completed' ||
    value === 'cancelled'
  ) {
    return value;
  }
  throw new BusinessRuleError('status de reserva no es válido');
}
