import { BusinessRuleError } from '../../../shared-kernel/domain/shared/errors/domain-error';
import { GeoPoint } from '../../../shared-kernel/domain/value-objects/geo-point.vo';
import type {
  BookingPrimitives,
  BookingStatus,
  PaymentMethod,
  PaymentStatus,
  ServiceType,
} from '../../../shared-kernel/domain/shared/types';
import type { DomainEvent } from '../../../shared-kernel/domain/events/domain-event';
import { BookingCreatedDomainEvent } from '../events/booking-created.domain-event';
import { BookingConfirmedDomainEvent } from '../events/booking-confirmed.domain-event';

export interface NewBookingProps {
  id: string;
  userId: string;
  petId: string;
  providerId: string;
  serviceType: ServiceType;
  visitMode: 'pickup-dropoff' | 'home-visit' | 'at-location';
  scheduledAt: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  addressReference?: string;
  notes?: string;
  total: number;
  originalTotal?: number;
  discountAmount?: number;
  paymentMethod: PaymentMethod;
  paymentId: string;
  paymentExpiresAt?: string;
  idempotencyKey?: string;
  promotionId?: string;
  createdAt: string;
}

export class Booking {
  private constructor(
    private readonly props: BookingPrimitives,
    private readonly domainEvents: DomainEvent[] = [],
  ) {}

  static create(input: NewBookingProps) {
    return Booking.build(input, 'confirmed');
  }

  static createPending(input: NewBookingProps, paymentExpiresAt: string) {
    const expiresAt = new Date(paymentExpiresAt);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
      throw new BusinessRuleError(
        'paymentExpiresAt debe ser una fecha futura válida',
      );
    }
    return Booking.build(input, 'pending', paymentExpiresAt, false);
  }

  private static build(
    input: NewBookingProps,
    status: BookingStatus,
    paymentExpiresAt?: string,
    emitCreatedEvent = true,
  ) {
    if (
      !input.scheduledAt ||
      Number.isNaN(new Date(input.scheduledAt).getTime())
    ) {
      throw new BusinessRuleError('scheduledAt debe ser una fecha válida');
    }
    const address = input.address?.trim();
    const addressReference = input.addressReference?.trim();
    let latitude: number | undefined;
    let longitude: number | undefined;

    if (input.visitMode === 'home-visit') {
      if (!address) {
        throw new BusinessRuleError(
          'address es requerido para visita a domicilio',
        );
      }
      if (!addressReference) {
        throw new BusinessRuleError(
          'addressReference es requerido para visita a domicilio',
        );
      }
      if (input.latitude === undefined || input.longitude === undefined) {
        throw new BusinessRuleError(
          'latitude y longitude son requeridas para visita a domicilio',
        );
      }
      const point = GeoPoint.inBolivia(input.latitude, input.longitude);
      latitude = point.latitude;
      longitude = point.longitude;
    }
    if (!input.paymentId) {
      throw new BusinessRuleError('paymentId es requerido');
    }

    const originalTotal = Math.round(input.originalTotal ?? input.total);
    const discountAmount = Math.round(
      input.discountAmount ?? Math.max(0, originalTotal - input.total),
    );
    const total = Math.round(input.total);
    if (
      !Number.isFinite(originalTotal) ||
      originalTotal <= 0 ||
      !Number.isFinite(total) ||
      total <= 0 ||
      !Number.isFinite(discountAmount) ||
      discountAmount < 0 ||
      originalTotal - discountAmount !== total
    ) {
      throw new BusinessRuleError(
        'Los importes de la reserva no son coherentes',
      );
    }

    const booking = new Booking({
      ...input,
      status,
      currency: 'COP',
      address,
      latitude,
      longitude,
      addressReference:
        input.visitMode === 'home-visit' ? addressReference : undefined,
      originalTotal,
      discountAmount,
      total,
      paymentExpiresAt:
        status === 'pending' ? paymentExpiresAt : input.paymentExpiresAt,
      idempotencyKey: input.idempotencyKey?.trim() || undefined,
    });
    if (emitCreatedEvent) {
      booking.domainEvents.push(
        new BookingCreatedDomainEvent(
          booking.id,
          booking.userId,
          booking.providerId,
          booking.toPrimitives().paymentId,
        ),
      );
    }
    return booking;
  }

  static rehydrate(props: BookingPrimitives) {
    return new Booking(props);
  }

  pullDomainEvents() {
    const events = [...this.domainEvents];
    this.domainEvents.length = 0;
    return events;
  }

  changeStatus(status: BookingStatus, reason?: string) {
    if (this.props.status === 'pending' && status === 'confirmed') {
      throw new BusinessRuleError(
        'Una reserva pendiente de pago solo puede confirmarse después del pago',
      );
    }
    if (!this.allowedTransitions()[this.props.status].includes(status)) {
      throw new BusinessRuleError(
        `No se puede cambiar una reserva de ${this.props.status} a ${status}`,
      );
    }
    this.props.status = status;
    if (status === 'rejected') {
      this.props.rejectionReason = reason?.trim() || 'Requisitos no cumplidos';
    }
  }

  confirmAfterPayment(paymentStatus: PaymentStatus) {
    if (paymentStatus !== 'paid') {
      throw new BusinessRuleError(
        'La reserva solo puede confirmarse después de un pago aprobado',
      );
    }
    if (this.props.status === 'confirmed') {
      return;
    }
    if (this.props.status !== 'pending') {
      throw new BusinessRuleError(
        'La reserva no está pendiente de confirmación por pago',
      );
    }
    this.props.status = 'confirmed';
    this.props.paymentExpiresAt = undefined;
    this.domainEvents.push(
      new BookingConfirmedDomainEvent(
        this.id,
        this.userId,
        this.providerId,
        this.props.paymentId,
      ),
    );
  }

  cancelExpiredPayment() {
    if (this.props.status !== 'pending') {
      return;
    }
    this.props.status = 'cancelled';
    this.props.rejectionReason = 'El tiempo para pagar la reserva expiró';
    this.props.paymentExpiresAt = undefined;
  }

  isPaymentExpired(at = new Date()) {
    return (
      this.props.status === 'pending' &&
      !!this.props.paymentExpiresAt &&
      new Date(this.props.paymentExpiresAt) <= at
    );
  }

  canReceiveReminder() {
    return ['confirmed', 'in-progress'].includes(this.props.status);
  }

  get id() {
    return this.props.id;
  }

  get userId() {
    return this.props.userId;
  }

  get petId() {
    return this.props.petId;
  }

  get providerId() {
    return this.props.providerId;
  }

  get status() {
    return this.props.status;
  }

  get scheduledAt() {
    return this.props.scheduledAt;
  }

  get rejectionReason() {
    return this.props.rejectionReason;
  }

  toPrimitives() {
    return { ...this.props };
  }

  private allowedTransitions(): Record<BookingStatus, BookingStatus[]> {
    return {
      pending: ['confirmed', 'rejected', 'cancelled'],
      confirmed: ['in-progress', 'rejected', 'cancelled'],
      rejected: [],
      'in-progress': ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    };
  }
}
