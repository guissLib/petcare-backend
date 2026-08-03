import {
  BadRequestException,
  Injectable,
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
import { Booking, BookingStatus } from '../shared/petcare.types';
import { NotificationsDomainService } from '../notifications/notifications.domain.service';
import { PaymentsDomainService } from '../payments/payments.domain.service';
import { PetsDomainService } from '../pets/pets.domain.service';
import { ProvidersDomainService } from '../providers/providers.domain.service';
import { PromotionsDomainService } from '../promotions/promotions.domain.service';
import { UsersDomainService } from '../users/users.domain.service';

@Injectable()
export class BookingsDomainService {
  constructor(
    private readonly store: PetcareStoreService,
    private readonly users: UsersDomainService,
    private readonly pets: PetsDomainService,
    private readonly providers: ProvidersDomainService,
    private readonly promotions: PromotionsDomainService,
    private readonly notifications: NotificationsDomainService,
    private readonly payments: PaymentsDomainService,
  ) {}

  create(userId: string, input: Input) {
    const user = this.users.getById(userId);
    required(input, [
      'petId',
      'providerId',
      'serviceType',
      'visitMode',
      'scheduledAt',
      'paymentMethod',
    ]);
    const petId = stringValue(input, 'petId');
    const providerId = stringValue(input, 'providerId');
    const serviceType = stringValue(
      input,
      'serviceType',
    ) as Booking['serviceType'];
    const visitMode = stringValue(input, 'visitMode') as Booking['visitMode'];
    const scheduledAt = stringValue(input, 'scheduledAt');
    const paymentMethod = stringValue(
      input,
      'paymentMethod',
    ) as Booking['paymentMethod'];
    const address = optionalString(input, 'address');
    const notes = optionalString(input, 'notes');

    const pet = this.pets.getById(petId);
    if (pet.ownerId !== userId) {
      throw new BadRequestException('La mascota no pertenece al usuario');
    }

    const provider = this.providers.getById(providerId);
    if (!provider.services.includes(serviceType)) {
      throw new BadRequestException('El proveedor no ofrece ese servicio');
    }
    if (visitMode === 'home-visit' && !provider.acceptsHomeVisits) {
      throw new BadRequestException(
        'El proveedor no ofrece visitas a domicilio',
      );
    }
    if (visitMode === 'home-visit' && !address) {
      throw new BadRequestException(
        'address es requerido para visita a domicilio',
      );
    }

    const availability = this.providers.availability(provider.id, {
      date: scheduledAt.slice(0, 10),
    });
    if (!availability.available) {
      throw new BadRequestException(
        'No hay disponibilidad para la fecha seleccionada',
      );
    }

    const needsVaccination = ['veterinary', 'boarding'].includes(serviceType);
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

    const baseTotal = Number(input.total ?? 50000);
    if (!Number.isFinite(baseTotal) || baseTotal <= 0) {
      throw new BadRequestException('total debe ser positivo');
    }
    const promotion = this.promotions
      .list({ city: user.city, providerId: provider.id })
      .find(
        (item) => !item.serviceTypes || item.serviceTypes.includes(serviceType),
      );
    const total = Math.round(
      baseTotal * (1 - (promotion?.discountPercent ?? 0) / 100),
    );
    const payment = this.payments.createBookingPayment(total, paymentMethod);
    const booking: Booking = {
      id: createId('booking'),
      userId,
      petId,
      providerId: provider.id,
      serviceType,
      visitMode,
      scheduledAt,
      address,
      notes,
      status: 'confirmed',
      total,
      payment,
      paymentMethod,
      promotionId: promotion?.id,
      createdAt: now(),
    };

    this.store.data.bookings.push(booking);
    this.notifications.send(
      userId,
      booking,
      'confirmation',
      `Reserva ${booking.id} confirmada`,
    );
    void this.store.persist();
    return booking;
  }

  list(query: Input) {
    const userId = optionalString(query, 'userId');
    const providerId = optionalString(query, 'providerId');
    const status = optionalString(query, 'status') as BookingStatus | undefined;
    return this.store.data.bookings.filter(
      (booking) =>
        (!userId || booking.userId === userId) &&
        (!providerId || booking.providerId === providerId) &&
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
