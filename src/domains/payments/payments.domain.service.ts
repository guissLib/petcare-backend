import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PETCARE_EVENT_BUS } from '../../application/ports/event-bus.port';
import type { PetcareEventBus } from '../../application/ports/event-bus.port';
import { PetcareStoreService } from '../../application/petcare-store.service';
import {
  createId,
  Input,
  optionalString,
  read,
  stringValue,
  now,
  required,
} from '../shared/input';
import {
  BookingRequest,
  Payment,
  PaymentConfirmedEvent,
  PaymentMethod,
  ServiceType,
} from '../shared/petcare.types';

@Injectable()
export class PaymentsDomainService {
  private readonly logger = new Logger(PaymentsDomainService.name);

  constructor(
    private readonly store: PetcareStoreService,
    @Inject(PETCARE_EVENT_BUS)
    private readonly eventBus: PetcareEventBus,
  ) {}

  async requestPayment(input: Input) {
    return this.createPayment(input, true);
  }

  async mockPayment(input: Input) {
    const hasBookingRequest =
      input.booking !== undefined ||
      input.userId !== undefined ||
      input.petId !== undefined;
    return this.createPayment(input, hasBookingRequest);
  }

  private async createPayment(input: Input, requiresBooking: boolean) {
    required(input, ['amount', 'method']);
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('amount debe ser positivo');
    }

    const method = stringValue(input, 'method') as PaymentMethod;
    if (!['online', 'at-location'].includes(method)) {
      throw new BadRequestException('method debe ser online o at-location');
    }

    const booking =
      method === 'online' && requiresBooking
        ? this.toBookingRequest(input)
        : undefined;
    const paymentId = createId('payment');
    const payment: Payment = {
      id: paymentId,
      method,
      status: method === 'online' ? 'paid' : 'pending',
      amount,
      provider: 'mock',
      reference: `MOCK-${paymentId.slice(-8).toUpperCase()}`,
    };

    this.store.data.payments.push(payment);
    await this.store.persist();
    this.logger.log(
      `[PAYMENT_CREATED] paymentId=${payment.id} status=${payment.status} ` +
        `method=${payment.method} amount=${payment.amount} ` +
        `bookingRequested=${Boolean(booking)}`,
    );

    if (payment.status === 'paid' && booking) {
      const event: PaymentConfirmedEvent = {
        eventId: createId('event'),
        type: 'payment.confirmed',
        occurredAt: now(),
        payment,
        booking,
      };
      this.logger.log(
        `[PAYMENT_EVENT_PUBLISHING] eventId=${event.eventId} ` +
          `paymentId=${payment.id} type=${event.type}`,
      );
      try {
        await this.eventBus.publish(event);
        this.logger.log(
          `[PAYMENT_EVENT_PUBLISHED] eventId=${event.eventId} ` +
            `paymentId=${payment.id}`,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `[PAYMENT_EVENT_PUBLISH_FAILED] eventId=${event.eventId} ` +
            `paymentId=${payment.id} error=${message}`,
        );
        throw error;
      }
    } else if (payment.status !== 'paid') {
      this.logger.log(
        `[PAYMENT_EVENT_SKIPPED] paymentId=${payment.id} ` +
          `reason=payment_not_confirmed`,
      );
    }

    return {
      ...payment,
      bookingStatus: booking ? 'queued' : 'not-requested',
    };
  }

  private toBookingRequest(input: Input): BookingRequest {
    const nestedBooking = read<Input>(input, 'booking');
    const source = nestedBooking ?? input;
    required(source, [
      'userId',
      'petId',
      'providerId',
      'serviceType',
      'visitMode',
      'scheduledAt',
    ]);

    return {
      userId: stringValue(source, 'userId'),
      petId: stringValue(source, 'petId'),
      providerId: stringValue(source, 'providerId'),
      serviceType: stringValue(source, 'serviceType') as ServiceType,
      visitMode: stringValue(
        source,
        'visitMode',
      ) as BookingRequest['visitMode'],
      scheduledAt: stringValue(source, 'scheduledAt'),
      address: optionalString(source, 'address'),
      notes: optionalString(source, 'notes'),
      total: source.total === undefined ? undefined : Number(source.total),
    };
  }
}
