import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PetcareStoreService } from '../../application/petcare-store.service';
import {
  createId,
  Input,
  optionalString,
  stringValue,
  now,
  required,
} from '../shared/input';
import {
  Booking,
  BookingStatus,
  PaymentConfirmedEvent,
} from '../shared/petcare.types';
import { NotificationsDomainService } from '../notifications/notifications.domain.service';
import { PetsDomainService } from '../pets/pets.domain.service';
import { ProvidersDomainService } from '../providers/providers.domain.service';
import { PromotionsDomainService } from '../promotions/promotions.domain.service';
import { UsersDomainService } from '../users/users.domain.service';

@Injectable()
export class BookingsDomainService {
  private readonly logger = new Logger(BookingsDomainService.name);

  constructor(
    private readonly store: PetcareStoreService,
    private readonly users: UsersDomainService,
    private readonly pets: PetsDomainService,
    private readonly providers: ProvidersDomainService,
    private readonly promotions: PromotionsDomainService,
    private readonly notifications: NotificationsDomainService,
  ) {}

  createFromPayment(event: PaymentConfirmedEvent) {
    const existing = this.store.data.bookings.find(
      (booking) => booking.payment.id === event.payment.id,
    );
    if (existing) {
      this.logger.warn(
        `[BOOKING_DUPLICATE_IGNORED] eventId=${event.eventId} ` +
          `paymentId=${event.payment.id} bookingId=${existing.id}`,
      );
      return existing;
    }

    const request = event.booking;
    const payment = event.payment;
    this.logger.log(
      `[BOOKING_CREATION_STARTED] eventId=${event.eventId} ` +
        `paymentId=${payment.id} userId=${request.userId} ` +
        `providerId=${request.providerId} serviceType=${request.serviceType}`,
    );
    const user = this.users.getById(request.userId);
    const pet = this.pets.getById(request.petId);
    if (pet.ownerId !== request.userId) {
      throw new BadRequestException('La mascota no pertenece al usuario');
    }

    const provider = this.providers.getById(request.providerId);
    if (!provider.services.includes(request.serviceType)) {
      throw new BadRequestException('El proveedor no ofrece ese servicio');
    }
    if (request.visitMode === 'home-visit' && !provider.acceptsHomeVisits) {
      throw new BadRequestException(
        'El proveedor no ofrece visitas a domicilio',
      );
    }
    if (request.visitMode === 'home-visit' && !request.address) {
      throw new BadRequestException(
        'address es requerido para visita a domicilio',
      );
    }

    const availability = this.providers.availability(provider.id, {
      date: request.scheduledAt.slice(0, 10),
    });
    if (!availability.available) {
      throw new BadRequestException(
        'No hay disponibilidad para la fecha seleccionada',
      );
    }

    const needsVaccination = ['veterinary', 'boarding'].includes(
      request.serviceType,
    );
    if (
      needsVaccination &&
      !pet.vaccinationRecords.some(
        (record) =>
          !record.expiresAt || new Date(record.expiresAt) >= new Date(),
      )
    ) {
      throw new BadRequestException(
        'La mascota requiere una vacuna vigente para este servicio',
      );
    }

    const promotion = this.promotions
      .list({ city: user.city, providerId: provider.id })
      .find(
        (item) =>
          !item.serviceTypes || item.serviceTypes.includes(request.serviceType),
      );
    const booking: Booking = {
      id: createId('booking'),
      userId: request.userId,
      petId: request.petId,
      providerId: provider.id,
      serviceType: request.serviceType,
      visitMode: request.visitMode,
      scheduledAt: request.scheduledAt,
      address: request.address,
      notes: request.notes,
      status: 'confirmed',
      total: payment.amount,
      payment,
      paymentMethod: payment.method,
      promotionId: promotion?.id,
      createdAt: now(),
    };

    this.store.data.bookings.push(booking);
    this.notifications.send(
      request.userId,
      booking,
      'confirmation',
      `Reserva ${booking.id} confirmada después del pago ${payment.reference}`,
    );
    void this.store.persist();
    this.logger.log(
      `[BOOKING_CREATED] eventId=${event.eventId} paymentId=${payment.id} ` +
        `bookingId=${booking.id} status=${booking.status} total=${booking.total}`,
    );
    return booking;
  }

  list(query: Input) {
    const userId = optionalString(query, 'userId');
    const providerId = optionalString(query, 'providerId');
    const paymentId = optionalString(query, 'paymentId');
    const status = optionalString(query, 'status') as BookingStatus | undefined;
    return this.store.data.bookings.filter(
      (booking) =>
        (!userId || booking.userId === userId) &&
        (!providerId || booking.providerId === providerId) &&
        (!paymentId || booking.payment.id === paymentId) &&
        (!status || booking.status === status),
    );
  }

  getById(bookingId: string) {
    const booking = this.store.data.bookings.find(
      (item) => item.id === bookingId,
    );
    if (!booking) throw new NotFoundException('Reserva no encontrada');
    return booking;
  }

  updateStatus(bookingId: string, input: Input) {
    const booking = this.getById(bookingId);
    required(input, ['status']);
    const allowed: BookingStatus[] = [
      'confirmed',
      'rejected',
      'in-progress',
      'completed',
      'cancelled',
    ];
    const status = stringValue(input, 'status') as BookingStatus;
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `status debe ser uno de: ${allowed.join(', ')}`,
      );
    }

    booking.status = status;
    if (status === 'rejected') {
      booking.rejectionReason =
        optionalString(input, 'reason') ?? 'Requisitos no cumplidos';
      this.notifications.send(
        booking.userId,
        booking,
        'rejection',
        `Reserva rechazada: ${booking.rejectionReason}`,
      );
    } else if (status === 'completed') {
      this.notifications.send(
        booking.userId,
        booking,
        'completion',
        `Reserva ${booking.id} completada`,
      );
    }
    void this.store.persist();
    return booking;
  }

  sendReminder(bookingId: string) {
    const booking = this.getById(bookingId);
    if (['cancelled', 'rejected', 'completed'].includes(booking.status)) {
      throw new BadRequestException(
        'No se puede recordar una reserva finalizada o cancelada',
      );
    }
    const notification = this.notifications.send(
      booking.userId,
      booking,
      'reminder',
      `Recordatorio: tienes una reserva el ${booking.scheduledAt}`,
    );
    void this.store.persist();
    return notification;
  }
}
