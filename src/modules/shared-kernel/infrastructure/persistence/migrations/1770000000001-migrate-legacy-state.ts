import { randomBytes, scryptSync } from 'node:crypto';
import type { MigrationInterface, QueryRunner } from 'typeorm';
import type {
  BookingPrimitives,
  DiscountType,
  NotificationPrimitives,
  PaymentPrimitives,
  PetPrimitives,
  PromotionPrimitives,
  ProviderPrimitives,
  UserRole,
  UserPrimitives,
} from '../../../domain/shared/types';

type LegacyPayment = Omit<PaymentPrimitives, 'currency' | 'createdAt'> & {
  currency?: string;
  createdAt?: string;
};

type LegacyBooking = Omit<
  BookingPrimitives,
  | 'currency'
  | 'paymentId'
  | 'originalTotal'
  | 'discountAmount'
  | 'latitude'
  | 'longitude'
  | 'addressReference'
> & {
  currency?: string;
  paymentId?: string;
  payment?: LegacyPayment;
  originalTotal?: number;
  discountAmount?: number;
  latitude?: number;
  longitude?: number;
  addressReference?: string;
};

type LegacyPromotion = Omit<
  PromotionPrimitives,
  'discountType' | 'discountValue'
> & {
  discountType?: DiscountType;
  discountValue?: number;
  discountPercent?: number;
};

interface LegacyState {
  users?: Array<
    Omit<UserPrimitives, 'passwordHash' | 'role'> & {
      passwordHash?: string;
      role?: UserRole;
    }
  >;
  providers?: ProviderPrimitives[];
  pets?: Array<
    Omit<PetPrimitives, 'vaccinationRecords'> & {
      vaccinationRecords?: PetPrimitives['vaccinationRecords'];
    }
  >;
  payments?: LegacyPayment[];
  promotions?: LegacyPromotion[];
  bookings?: LegacyBooking[];
  notifications?: NotificationPrimitives[];
}

export class MigrateLegacyState1770000000001 implements MigrationInterface {
  name = 'MigrateLegacyState1770000000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tables = (await queryRunner.query(
      "SHOW TABLES LIKE 'petcare_state'",
    )) as unknown[];
    if (tables.length === 0) {
      return;
    }

    const rows = (await queryRunner.query(
      'SELECT state_json FROM petcare_state WHERE state_key = ?',
      ['main'],
    )) as Array<{ state_json: string | LegacyState }>;
    if (rows.length === 0) {
      return;
    }

    const state = parseState(rows[0].state_json);
    const users = state.users ?? [];
    const providers = ensureReferencedProviders(
      [...(state.providers ?? [])],
      state.bookings ?? [],
    );
    const pets = state.pets ?? [];
    const payments = state.payments ?? [];
    const promotions = state.promotions ?? [];
    const bookings = state.bookings ?? [];
    const notifications = state.notifications ?? [];

    for (const user of users) {
      await queryRunner.query(
        `INSERT INTO users
          (id, name, email, role, city, phone, password_hash, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.id,
          user.name,
          user.email,
          user.role ?? 'pet-owner',
          user.city ?? null,
          user.phone ?? null,
          user.passwordHash ?? disabledPasswordHash(),
          toDate(user.createdAt),
        ],
      );
    }

    for (const provider of providers) {
      await queryRunner.query(
        `INSERT INTO providers
          (id, operator_user_id, name, type, city, address, latitude,
           longitude, capacity, accepts_home_visits)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          provider.id,
          provider.operatorUserId ?? null,
          provider.name,
          provider.type,
          provider.city,
          provider.address,
          provider.latitude,
          provider.longitude,
          provider.capacity,
          provider.acceptsHomeVisits,
        ],
      );

      for (const serviceType of provider.services ?? []) {
        await queryRunner.query(
          `INSERT INTO provider_services (provider_id, service_type)
           VALUES (?, ?)`,
          [provider.id, serviceType],
        );
      }

      for (const schedule of provider.schedule ?? []) {
        await queryRunner.query(
          `INSERT INTO provider_schedules
            (provider_id, day_of_week, start_time, end_time)
           VALUES (?, ?, ?, ?)`,
          [provider.id, schedule.dayOfWeek, schedule.start, schedule.end],
        );
      }
    }

    for (const pet of pets) {
      await insertPet(queryRunner, pet);
    }

    const paymentCreatedAt = paymentCreatedAtByBooking(bookings);
    for (const payment of payments) {
      await insertPayment(
        queryRunner,
        payment,
        paymentCreatedAt.get(payment.id),
      );
    }

    for (const promotion of promotions) {
      await insertPromotion(queryRunner, promotion);
    }

    for (const booking of bookings) {
      await insertBooking(queryRunner, booking);
    }

    for (const notification of notifications) {
      await insertNotification(queryRunner, notification);
    }
  }

  async down(): Promise<void> {
    // The schema migration removes the imported rows when it is reverted.
  }
}

function ensureReferencedProviders(
  providers: ProviderPrimitives[],
  bookings: LegacyBooking[],
) {
  const knownProviderIds = new Set(providers.map((provider) => provider.id));
  for (const booking of bookings) {
    if (knownProviderIds.has(booking.providerId)) {
      continue;
    }

    const provider = defaultProvider(booking.providerId);
    if (!provider) {
      throw new Error(
        `Legacy booking ${booking.id} references unknown provider ${booking.providerId}`,
      );
    }
    providers.push(provider);
    knownProviderIds.add(provider.id);
  }
  return providers;
}

function defaultProvider(id: string): ProviderPrimitives | undefined {
  if (id === 'provider_centro') {
    return {
      id,
      name: 'PetCare Centro',
      type: 'employee',
      city: 'Bogotá',
      address: 'Calle 100 # 12-30',
      latitude: 4.676,
      longitude: -74.048,
      capacity: 8,
      acceptsHomeVisits: true,
      services: ['grooming', 'veterinary', 'walking', 'home-visit', 'cleaning'],
      schedule: [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
        dayOfWeek,
        start: '08:00:00',
        end: '18:00:00',
      })),
    };
  }

  if (id === 'provider_norte') {
    return {
      id,
      name: 'PetCare Norte',
      type: 'franchise',
      city: 'Medellín',
      address: 'Carrera 43A # 10-20',
      latitude: 6.208,
      longitude: -75.567,
      capacity: 5,
      acceptsHomeVisits: false,
      services: ['grooming', 'boarding', 'veterinary', 'cleaning'],
      schedule: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
        dayOfWeek,
        start: '09:00:00',
        end: '17:00:00',
      })),
    };
  }

  return undefined;
}

function paymentCreatedAtByBooking(bookings: LegacyBooking[]) {
  const createdAtByPayment = new Map<string, string>();
  for (const booking of bookings) {
    const paymentId = booking.paymentId ?? booking.payment?.id;
    if (paymentId && booking.createdAt) {
      createdAtByPayment.set(paymentId, booking.createdAt);
    }
  }
  return createdAtByPayment;
}

async function insertPet(
  queryRunner: QueryRunner,
  pet: Omit<PetPrimitives, 'vaccinationRecords'> & {
    vaccinationRecords?: PetPrimitives['vaccinationRecords'];
  },
) {
  await queryRunner.query(
    `INSERT INTO pets
      (id, owner_id, name, species, breed, weight_kg, special_handling)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      pet.id,
      pet.ownerId,
      pet.name,
      pet.species,
      pet.breed ?? null,
      pet.weightKg ?? null,
      pet.specialHandling ?? null,
    ],
  );

  for (const vaccination of pet.vaccinationRecords ?? []) {
    await queryRunner.query(
      `INSERT INTO pet_vaccinations
        (id, pet_id, vaccine, administered_at, expires_at, document_url,
         document_blob, document_mime_type, document_name, document_size)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        vaccination.id,
        pet.id,
        vaccination.vaccine,
        toDate(vaccination.administeredAt),
        vaccination.expiresAt ? toDate(vaccination.expiresAt) : null,
        vaccination.documentUrl ?? null,
        null,
        vaccination.documentMimeType ?? null,
        vaccination.documentName ?? null,
        vaccination.documentSize ?? null,
      ],
    );
  }
}

async function insertPayment(
  queryRunner: QueryRunner,
  payment: LegacyPayment,
  fallbackCreatedAt?: string,
) {
  await queryRunner.query(
    `INSERT INTO payments
      (id, method, status, amount, currency, provider, reference, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payment.id,
      payment.method,
      payment.status,
      payment.amount,
      payment.currency ?? 'COP',
      payment.provider,
      payment.reference,
      toDate(
        payment.createdAt ?? fallbackCreatedAt ?? '1970-01-01T00:00:00.000Z',
      ),
    ],
  );
}

async function insertPromotion(
  queryRunner: QueryRunner,
  promotion: LegacyPromotion,
) {
  const legacyDiscount =
    promotion.discountValue ?? promotion.discountPercent ?? 0;
  const discountValue = legacyDiscount > 0 ? legacyDiscount : 1;
  const city = await legacyPromotionCity(queryRunner, promotion);
  await queryRunner.query(
    `INSERT INTO promotions
      (id, name, description, discount_type, discount_value, scope, city,
       provider_id, starts_at, ends_at, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      promotion.id,
      promotion.name,
      promotion.description,
      promotion.discountType ?? 'percent',
      discountValue,
      promotion.scope,
      city,
      promotion.providerId ?? null,
      toDate(promotion.startsAt),
      toDate(promotion.endsAt),
      promotion.active && legacyDiscount > 0 && city !== 'Ciudad migrada',
    ],
  );

  for (const serviceType of promotion.serviceTypes ?? []) {
    await queryRunner.query(
      `INSERT INTO promotion_service_types (promotion_id, service_type)
       VALUES (?, ?)`,
      [promotion.id, serviceType],
    );
  }
}

async function legacyPromotionCity(
  queryRunner: QueryRunner,
  promotion: LegacyPromotion,
) {
  if (promotion.scope !== 'local') {
    return null;
  }
  if (promotion.city?.trim()) {
    return promotion.city.trim();
  }
  if (promotion.providerId) {
    const providers = (await queryRunner.query(
      'SELECT city FROM providers WHERE id = ?',
      [promotion.providerId],
    )) as Array<{ city?: string }>;
    const providerCity = providers[0]?.city?.trim();
    if (providerCity) {
      return providerCity;
    }
  }
  return 'Ciudad migrada';
}

async function insertBooking(queryRunner: QueryRunner, booking: LegacyBooking) {
  const paymentId = booking.paymentId ?? booking.payment?.id;
  if (!paymentId) {
    throw new Error(`Legacy booking ${booking.id} has no payment id`);
  }

  await queryRunner.query(
    `INSERT INTO bookings
      (id, user_id, pet_id, provider_id, service_type, visit_mode,
       scheduled_at, address, address_reference, latitude, longitude, notes,
       status, total, original_total, discount_amount, currency, payment_method,
       payment_id, promotion_id, rejection_reason, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      booking.id,
      booking.userId,
      booking.petId,
      booking.providerId,
      booking.serviceType,
      booking.visitMode,
      toDate(booking.scheduledAt),
      booking.address ?? null,
      booking.addressReference ?? null,
      booking.latitude ?? null,
      booking.longitude ?? null,
      booking.notes ?? null,
      booking.status,
      booking.total,
      booking.originalTotal ?? booking.total,
      booking.discountAmount ?? 0,
      booking.currency ?? 'COP',
      booking.paymentMethod,
      paymentId,
      booking.promotionId ?? null,
      booking.rejectionReason ?? null,
      toDate(booking.createdAt),
    ],
  );
}

async function insertNotification(
  queryRunner: QueryRunner,
  notification: NotificationPrimitives,
) {
  await queryRunner.query(
    `INSERT INTO notifications
      (id, user_id, booking_id, type, message, channel, sent_at, is_read)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      notification.id,
      notification.userId,
      notification.bookingId ?? null,
      notification.type,
      notification.message,
      notification.channel,
      toDate(notification.sentAt),
      notification.read,
    ],
  );
}

function parseState(value: string | LegacyState): LegacyState {
  return typeof value === 'string' ? (JSON.parse(value) as LegacyState) : value;
}

function toDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid legacy date: ${value}`);
  }
  return date;
}

function disabledPasswordHash() {
  const salt = randomBytes(16);
  const secret = randomBytes(32);
  const hash = scryptSync(secret, salt, 64).toString('base64');
  return `scrypt$16384$8$1$${salt.toString('base64')}$${hash}`;
}
