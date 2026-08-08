import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  AccessDeniedError,
  BusinessRuleError,
  EntityNotFoundError,
} from '../../shared-kernel/domain/shared/errors/domain-error';
import { Booking } from '../domain/entities/booking.entity';
import type { NewBookingProps } from '../domain/entities/booking.entity';
import { Notification } from '../../notification/domain/entities/notification.entity';
import {
  BookingPolicy,
  requiresVaccination,
} from '../domain/services/booking-policy.service';
import { ProviderAvailabilityService } from '../../provider/domain/services/provider-availability.service';
import { BOOKING_REPOSITORY } from '../domain/repositories/booking.repository';
import type { BookingRepository } from '../domain/repositories/booking.repository';
import { BOOKING_PAYMENT_TRANSACTION } from '../domain/repositories/booking-payment-transaction';
import type { BookingPaymentTransaction } from '../domain/repositories/booking-payment-transaction';
import { NOTIFICATION_REPOSITORY } from '../../notification/domain/repositories/notification.repository';
import type { NotificationRepository } from '../../notification/domain/repositories/notification.repository';
import { PET_REPOSITORY } from '../../pet/domain/repositories/pet.repository';
import type { PetRepository } from '../../pet/domain/repositories/pet.repository';
import { PROVIDER_REPOSITORY } from '../../provider/domain/repositories/provider.repository';
import type { ProviderRepository } from '../../provider/domain/repositories/provider.repository';
import type {
  BookingStatus,
  PaymentMethod,
  ServiceType,
} from '../../shared-kernel/domain/shared/types';
import { USER_REPOSITORY } from '../../user/domain/repositories/user.repository';
import type { UserRepository } from '../../user/domain/repositories/user.repository';
import { PAYMENT_REPOSITORY } from '../../payment/domain/repositories/payment.repository';
import type { PaymentRepository } from '../../payment/domain/repositories/payment.repository';
import { PaymentsApplicationService } from '../../payment/application/payments.application.service';
import { basePriceFor } from '../../shared-kernel/domain/services/service-pricing.service';
import { GeoPoint } from '../../shared-kernel/domain/value-objects/geo-point.vo';
import {
  createId,
  now,
  optionalText,
  required,
  text,
  type Input,
} from '../../shared-kernel/application/shared/application.utils';
import { PROMOTION_REPOSITORY } from '../../promotion/domain/repositories/promotion.repository';
import type { PromotionRepository } from '../../promotion/domain/repositories/promotion.repository';
import { EVENT_BUS } from '../../shared-kernel/application/ports/event-bus.port';
import type { EventBus } from '../../shared-kernel/application/ports/event-bus.port';
import type { PaymentConfirmedMessage } from '../../shared-kernel/application/ports/payment-event-bus.port';

export interface BookingActor {
  id: string;
  role: 'pet-owner' | 'provider' | 'administrator';
  providerId?: string;
}

const PAYMENT_WINDOW_MS = 30 * 60 * 1000;

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
    @Optional()
    @Inject(BOOKING_PAYMENT_TRANSACTION)
    private readonly paymentTransaction?: BookingPaymentTransaction,
    @Optional()
    @Inject(EVENT_BUS)
    private readonly eventBus?: EventBus,
  ) {}

  async quote(userId: string, input: Input, actor?: BookingActor) {
    this.assertUserRouteAccess(userId, actor);
    const context = await this.bookingContext(userId, input);
    this.bookingPolicy.validate(
      context.pet,
      context.provider,
      context.serviceType,
      context.visitMode,
      context.availability,
      false,
    );

    const promotion = await this.findApplicablePromotion(context);
    const originalTotal = basePriceFor(context.serviceType);
    const discount = promotion?.calculateDiscount(originalTotal) ?? {
      discountAmount: 0,
      finalAmount: originalTotal,
    };
    if (discount.finalAmount <= 0) {
      throw new BusinessRuleError(
        'La promoción no puede dejar el total de la reserva en cero',
      );
    }

    const vaccinationRequired = requiresVaccination(context.serviceType);
    const vaccinationValid = context.pet.hasCurrentVaccination();
    return {
      currency: 'COP',
      serviceType: context.serviceType,
      originalTotal,
      discountAmount: discount.discountAmount,
      total: discount.finalAmount,
      promotion: promotion
        ? {
            ...promotion.toPrimitives(),
          }
        : undefined,
      vaccinationRequired,
      vaccinationValid,
      vaccinationMessage:
        vaccinationRequired && !vaccinationValid
          ? 'Para este servicio es obligatorio adjuntar el carnet de vacunación.'
          : undefined,
    };
  }

  async create(userId: string, input: Input, actor?: BookingActor) {
    this.assertUserRouteAccess(userId, actor);
    required(input, [
      'petId',
      'providerId',
      'serviceType',
      'visitMode',
      'scheduledAt',
      'paymentMethod',
    ]);
    const idempotencyKey = optionalText(input, 'idempotencyKey');
    if (idempotencyKey) {
      const existing = await this.bookings.findByIdempotencyKey(idempotencyKey);
      if (existing) {
        this.assertCanView(existing, actor);
        return this.response(existing, actor);
      }
    }

    const context = await this.bookingContext(userId, input);
    this.bookingPolicy.validate(
      context.pet,
      context.provider,
      context.serviceType,
      context.visitMode,
      context.availability,
    );
    const quote = await this.quote(userId, input);
    const paymentMethod = readPaymentMethod(input.paymentMethod);
    if (paymentMethod === 'online' && !input.paymentId) {
      const payment = this.paymentService.createPending(
        userId,
        quote.total,
        paymentMethod,
      );
      const paymentExpiresAt = new Date(
        Date.now() + PAYMENT_WINDOW_MS,
      ).toISOString();
      const booking = Booking.createPending(
        this.newBookingProps(
          userId,
          input,
          context,
          quote,
          paymentMethod,
          payment.id,
        ),
        paymentExpiresAt,
      );
      await this.savePendingPayment(payment, booking);
      return this.response(booking, actor);
    }

    const payment = input.paymentId
      ? await this.getPayment(text(input, 'paymentId'))
      : await this.paymentService.charge(quote.total, paymentMethod, userId);

    if (payment.status === 'failed') {
      throw new BusinessRuleError('El pago no fue aprobado');
    }
    if (paymentMethod === 'online' && payment.status !== 'paid') {
      throw new BusinessRuleError(
        'El pago online debe estar aprobado antes de crear la reserva',
      );
    }
    if (payment.amount !== quote.total) {
      throw new BusinessRuleError(
        'El valor del pago no coincide con el total de la reserva',
      );
    }
    this.assertPaymentOwner(payment, userId);
    const existing = await this.bookings.findByPaymentId(payment.id);
    if (existing) {
      return this.response(existing, actor);
    }

    const booking = Booking.create(
      this.newBookingProps(
        userId,
        input,
        context,
        quote,
        paymentMethod,
        payment.id,
      ),
    );
    await this.bookings.save(booking);
    await this.notifyBookingConfirmed(booking);
    return this.response(booking, actor);
  }

  async pay(bookingId: string, input: Input, actor?: BookingActor) {
    const booking = await this.getBooking(bookingId);
    this.assertCanPay(booking, actor);
    if (booking.isPaymentExpired()) {
      booking.cancelExpiredPayment();
      await this.bookings.save(booking);
      throw new BusinessRuleError(
        'El tiempo para pagar esta reserva ya expiró',
      );
    }
    const payment = await this.getPayment(booking.toPrimitives().paymentId);
    this.assertPaymentOwner(payment, booking.userId);
    if (payment.method !== 'online') {
      throw new BusinessRuleError('Esta reserva no requiere un pago online');
    }
    if (
      ['confirmed', 'pending-confirmation'].includes(booking.status) &&
      payment.status === 'paid'
    ) {
      if (booking.status === 'pending-confirmation') {
        await this.paymentService.publishPaymentConfirmed(payment, booking);
      }
      return {
        booking: await this.response(booking, actor),
        payment: payment.toPrimitives(),
        confirmationStatus: booking.status,
      };
    }
    if (booking.status !== 'pending') {
      throw new BusinessRuleError('La reserva ya no está pendiente de pago');
    }
    if (payment.amount !== booking.toPrimitives().total) {
      throw new BusinessRuleError(
        'El valor del pago no coincide con el total de la reserva',
      );
    }
    const processed = await this.paymentService.processInput(payment, input);
    if (processed.status === 'failed') {
      await this.paymentService.save(processed);
      return {
        booking: await this.response(booking, actor),
        payment: processed.toPrimitives(),
      };
    }
    if (processed.status !== 'paid') {
      await this.paymentService.save(processed);
      return {
        booking: await this.response(booking, actor),
        payment: processed.toPrimitives(),
      };
    }
    booking.markPendingConfirmation(processed.status);
    await this.savePaymentAndBooking(processed, booking);
    await this.paymentService.publishPaymentConfirmed(processed, booking);
    return {
      booking: await this.response(booking, actor),
      payment: processed.toPrimitives(),
      confirmationStatus: 'pending-confirmation' as const,
    };
  }

  async confirmFromPaymentEvent(message: PaymentConfirmedMessage) {
    const booking = await this.getBooking(message.bookingId);
    const data = booking.toPrimitives();
    if (
      data.userId !== message.userId ||
      data.providerId !== message.providerId ||
      data.paymentId !== message.paymentId ||
      data.total !== message.amount ||
      data.currency !== message.currency
    ) {
      throw new BusinessRuleError(
        'El evento de pago no coincide con la reserva',
      );
    }
    const payment = await this.getPayment(data.paymentId);
    if (
      (payment.userId && payment.userId !== message.userId) ||
      payment.status !== 'paid' ||
      payment.amount !== data.total
    ) {
      throw new BusinessRuleError(
        'No se puede confirmar una reserva sin un pago aprobado',
      );
    }
    if (booking.status === 'confirmed') {
      return;
    }
    if (booking.status === 'pending') {
      booking.markPendingConfirmation(payment.status);
    }
    booking.confirmAfterPayment(payment.status);
    await this.bookings.save(booking);
    await this.publishBookingConfirmed(booking);
  }

  async expirePendingPayments() {
    const pendingBookings = (await this.bookings.findAll()).filter((booking) =>
      booking.isPaymentExpired(),
    );
    for (const booking of pendingBookings) {
      booking.cancelExpiredPayment();
      await this.bookings.save(booking);
    }
    return pendingBookings.length;
  }

  private newBookingProps(
    userId: string,
    input: Input,
    context: Awaited<ReturnType<BookingsApplicationService['bookingContext']>>,
    quote: Awaited<ReturnType<BookingsApplicationService['quote']>>,
    paymentMethod: PaymentMethod,
    paymentId: string,
  ): NewBookingProps {
    return {
      id: createId('booking'),
      userId,
      petId: context.pet.id,
      providerId: context.provider.id,
      serviceType: context.serviceType,
      visitMode: context.visitMode,
      scheduledAt: text(input, 'scheduledAt'),
      address: optionalText(input, 'address'),
      latitude: optionalNumber(input, 'latitude'),
      longitude: optionalNumber(input, 'longitude'),
      addressReference: optionalText(input, 'addressReference'),
      notes: optionalText(input, 'notes'),
      total: quote.total,
      originalTotal: quote.originalTotal,
      discountAmount: quote.discountAmount,
      paymentMethod,
      paymentId,
      idempotencyKey: optionalText(input, 'idempotencyKey'),
      promotionId: quote.promotion?.id,
      createdAt: now(),
    };
  }

  private async savePendingPayment(
    payment: Awaited<ReturnType<PaymentsApplicationService['createPending']>>,
    booking: Booking,
  ) {
    if (this.paymentTransaction) {
      await this.paymentTransaction.savePending(payment, booking);
      return;
    }
    await this.paymentService.save(payment);
    await this.bookings.save(booking);
  }

  private async savePaymentAndBooking(
    payment: Awaited<ReturnType<PaymentsApplicationService['createPending']>>,
    booking: Booking,
  ) {
    if (this.paymentTransaction) {
      await this.paymentTransaction.saveAfterPayment(payment, booking);
      return;
    }
    await this.paymentService.save(payment);
    await this.bookings.save(booking);
  }

  private assertPaymentOwner(
    payment: Awaited<ReturnType<BookingsApplicationService['getPayment']>>,
    userId: string,
  ) {
    if (payment.userId && payment.userId !== userId) {
      throw new AccessDeniedError('El pago no pertenece al usuario');
    }
  }

  private assertCanPay(booking: Booking, actor?: BookingActor) {
    if (actor?.role === 'administrator') {
      return;
    }
    if (actor?.role === 'pet-owner' && actor.id === booking.userId) {
      return;
    }
    throw new AccessDeniedError(
      'Solo el propietario de la reserva puede pagarla',
    );
  }

  private async notifyBookingConfirmed(booking: Booking) {
    await this.notify(
      booking.userId,
      booking.id,
      'confirmation',
      `Reserva ${booking.id} confirmada`,
    );
    const provider = await this.getProvider(booking.providerId);
    if (provider.toPrimitives().operatorUserId) {
      await this.notify(
        provider.toPrimitives().operatorUserId as string,
        booking.id,
        'confirmation',
        `Nueva reserva pagada ${booking.id}`,
      );
    }
  }

  private async publishBookingConfirmed(booking: Booking) {
    const event = booking
      .pullDomainEvents()
      .find((candidate) => candidate.eventName === 'booking.confirmed');
    if (event && this.eventBus) {
      await this.eventBus.publish(event);
      return;
    }
    await this.notifyBookingConfirmed(booking);
  }

  async list(query: Input, actor?: BookingActor) {
    const scopedQuery = this.scopedQuery(query, actor);
    const bookings = await this.bookings.findAll();
    const filtered = bookings.filter(
      (booking) =>
        !(
          actor?.role === 'provider' &&
          ['pending', 'pending-confirmation'].includes(booking.status)
        ) &&
        (!scopedQuery.userId ||
          booking.toPrimitives().userId === text(scopedQuery, 'userId')) &&
        (!scopedQuery.providerId ||
          booking.toPrimitives().providerId ===
            text(scopedQuery, 'providerId')) &&
        (!scopedQuery.status || booking.status === scopedQuery.status) &&
        (!scopedQuery.paymentId ||
          booking.toPrimitives().paymentId === text(scopedQuery, 'paymentId')),
    );
    return Promise.all(
      filtered.map((booking) => this.response(booking, actor)),
    );
  }

  async getById(bookingId: string, actor?: BookingActor) {
    const booking = await this.getBooking(bookingId);
    this.assertCanView(booking, actor);
    return this.response(booking, actor);
  }

  async updateStatus(bookingId: string, input: Input, actor?: BookingActor) {
    const booking = await this.getBooking(bookingId);
    this.assertCanManage(booking, actor);
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
    return this.response(booking, actor);
  }

  async sendReminder(bookingId: string, actor?: BookingActor) {
    const booking = await this.getBooking(bookingId);
    this.assertCanView(booking, actor);
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

  private async bookingContext(userId: string, input: Input) {
    required(input, [
      'petId',
      'providerId',
      'serviceType',
      'visitMode',
      'scheduledAt',
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
    validateVisitAddress(input, visitMode);
    const availability = this.availabilityService.calculate(
      provider,
      scheduledAt,
      await this.bookings.findAll(),
    );
    return {
      user,
      pet,
      provider,
      serviceType,
      visitMode,
      scheduledAt,
      availability,
    };
  }

  private async findApplicablePromotion(context: {
    user: Awaited<ReturnType<BookingsApplicationService['getUser']>>;
    provider: Awaited<ReturnType<BookingsApplicationService['getProvider']>>;
    serviceType: ServiceType;
    scheduledAt: string;
  }) {
    const city = context.user.toPrimitives().city;
    const candidates = (await this.promotions.findAll()).filter((promotion) =>
      promotion.appliesTo(
        city,
        context.provider.id,
        context.serviceType,
        new Date(context.scheduledAt),
      ),
    );
    return candidates.sort((left, right) => {
      const leftSpecificity = left.providerId
        ? 2
        : left.toPrimitives().city
          ? 1
          : 0;
      const rightSpecificity = right.providerId
        ? 2
        : right.toPrimitives().city
          ? 1
          : 0;
      return rightSpecificity - leftSpecificity;
    })[0];
  }

  private async response(booking: Booking, actor?: BookingActor) {
    const payment = await this.getPayment(booking.toPrimitives().paymentId);
    const data = booking.toPrimitives();
    if (!this.canSeeAddress(booking, actor)) {
      delete data.address;
      delete data.latitude;
      delete data.longitude;
      delete data.addressReference;
    }
    return {
      ...data,
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

  private scopedQuery(query: Input, actor?: BookingActor) {
    if (!actor || actor.role === 'administrator') {
      return query;
    }
    if (actor.role === 'pet-owner') {
      return { ...query, userId: actor.id };
    }
    if (!actor.providerId) {
      throw new AccessDeniedError(
        'El usuario proveedor no tiene proveedor asociado',
      );
    }
    return { ...query, providerId: actor.providerId };
  }

  private assertUserRouteAccess(userId: string, actor?: BookingActor) {
    if (actor && actor.role === 'pet-owner' && actor.id !== userId) {
      throw new AccessDeniedError('No puede crear reservas para otro usuario');
    }
  }

  private assertCanView(booking: Booking, actor?: BookingActor) {
    if (!actor || actor.role === 'administrator') {
      return;
    }
    if (actor.role === 'pet-owner' && booking.userId === actor.id) {
      return;
    }
    if (
      actor.role === 'provider' &&
      actor.providerId &&
      booking.providerId === actor.providerId &&
      !['pending', 'pending-confirmation'].includes(booking.status)
    ) {
      return;
    }
    throw new AccessDeniedError('No tiene acceso a esta reserva');
  }

  private assertCanManage(booking: Booking, actor?: BookingActor) {
    if (!actor || actor.role === 'administrator') {
      return;
    }
    if (
      actor.role === 'provider' &&
      actor.providerId &&
      booking.providerId === actor.providerId &&
      !['pending', 'pending-confirmation'].includes(booking.status)
    ) {
      return;
    }
    throw new AccessDeniedError(
      'Solo el proveedor responsable o un administrador puede cambiar el estado',
    );
  }

  private canSeeAddress(booking: Booking, actor?: BookingActor) {
    if (!actor || actor.role === 'administrator') {
      return true;
    }
    if (actor.role === 'pet-owner' && booking.userId === actor.id) {
      return true;
    }
    return (
      actor.role === 'provider' &&
      actor.providerId === booking.providerId &&
      booking.status === 'confirmed'
    );
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

function optionalNumber(input: Input, field: string) {
  if (
    input[field] === undefined ||
    input[field] === null ||
    input[field] === ''
  ) {
    return undefined;
  }
  const value = Number(input[field]);
  return Number.isFinite(value) ? value : undefined;
}

function validateVisitAddress(
  input: Input,
  visitMode: 'pickup-dropoff' | 'home-visit' | 'at-location',
) {
  if (visitMode !== 'home-visit') {
    return;
  }
  if (!optionalText(input, 'address')) {
    throw new BusinessRuleError('address es requerido para visita a domicilio');
  }
  if (!optionalText(input, 'addressReference')) {
    throw new BusinessRuleError(
      'addressReference es requerido para visita a domicilio',
    );
  }
  const latitude = optionalNumber(input, 'latitude');
  const longitude = optionalNumber(input, 'longitude');
  if (latitude === undefined || longitude === undefined) {
    throw new BusinessRuleError(
      'latitude y longitude son requeridas para visita a domicilio',
    );
  }
  GeoPoint.inBolivia(latitude, longitude);
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
    value === 'home-visit' ||
    value === 'cleaning'
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
    value === 'pending-confirmation' ||
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
