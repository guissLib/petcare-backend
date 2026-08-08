import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePetcareSchema1770000000000 implements MigrationInterface {
  name = 'CreatePetcareSchema1770000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE users (
        id VARCHAR(64) NOT NULL,
        name VARCHAR(120) NOT NULL,
        email VARCHAR(320) NOT NULL,
        role VARCHAR(20) NOT NULL,
        city VARCHAR(120) NULL,
        phone VARCHAR(32) NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at DATETIME(3) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY UQ_users_email (email),
        CONSTRAINT CHK_users_text
          CHECK (
            CHAR_LENGTH(TRIM(name)) > 0
            AND CHAR_LENGTH(TRIM(email)) > 0
          ),
        CONSTRAINT CHK_users_role
          CHECK (role IN ('pet-owner', 'provider', 'administrator')),
        CONSTRAINT CHK_users_city
          CHECK (
            role = 'administrator'
            OR (
              city IS NOT NULL
              AND CHAR_LENGTH(TRIM(city)) > 0
            )
          )
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE providers (
        id VARCHAR(64) NOT NULL,
        operator_user_id VARCHAR(64) NULL,
        name VARCHAR(120) NOT NULL,
        type VARCHAR(20) NOT NULL,
        city VARCHAR(120) NOT NULL,
        address VARCHAR(255) NOT NULL,
        latitude DECIMAL(10,7) NOT NULL,
        longitude DECIMAL(10,7) NOT NULL,
        capacity INT UNSIGNED NOT NULL,
        accepts_home_visits BOOLEAN NOT NULL DEFAULT FALSE,
        PRIMARY KEY (id),
        UNIQUE KEY UQ_providers_operator_user_id (operator_user_id),
        KEY IDX_providers_city (city),
        CONSTRAINT FK_providers_operator_user
          FOREIGN KEY (operator_user_id) REFERENCES users (id)
          ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT CHK_providers_type
          CHECK (type IN ('employee', 'contractor', 'franchise')),
        CONSTRAINT CHK_providers_text
          CHECK (
            CHAR_LENGTH(TRIM(name)) > 0
            AND CHAR_LENGTH(TRIM(city)) > 0
            AND CHAR_LENGTH(TRIM(address)) > 0
          ),
        CONSTRAINT CHK_providers_capacity
          CHECK (capacity > 0)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE provider_services (
        provider_id VARCHAR(64) NOT NULL,
        service_type VARCHAR(32) NOT NULL,
        PRIMARY KEY (provider_id, service_type),
        CONSTRAINT FK_provider_services_provider
          FOREIGN KEY (provider_id) REFERENCES providers (id)
          ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT CHK_provider_services_type
          CHECK (
            service_type IN (
              'grooming',
              'walking',
              'boarding',
              'veterinary',
              'home-visit',
              'cleaning'
            )
          )
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE provider_schedules (
        provider_id VARCHAR(64) NOT NULL,
        day_of_week TINYINT UNSIGNED NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        PRIMARY KEY (provider_id, day_of_week),
        CONSTRAINT FK_provider_schedules_provider
          FOREIGN KEY (provider_id) REFERENCES providers (id)
          ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT CHK_provider_schedules_day
          CHECK (day_of_week BETWEEN 1 AND 7),
        CONSTRAINT CHK_provider_schedules_range
          CHECK (start_time < end_time)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE pets (
        id VARCHAR(64) NOT NULL,
        owner_id VARCHAR(64) NOT NULL,
        name VARCHAR(120) NOT NULL,
        species VARCHAR(16) NOT NULL,
        breed VARCHAR(120) NULL,
        weight_kg DECIMAL(7,2) NULL,
        special_handling VARCHAR(500) NULL,
        PRIMARY KEY (id),
        KEY IDX_pets_owner_id (owner_id),
        CONSTRAINT FK_pets_owner
          FOREIGN KEY (owner_id) REFERENCES users (id)
          ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT CHK_pets_species
          CHECK (species IN ('dog', 'cat', 'bird', 'other')),
        CONSTRAINT CHK_pets_name
          CHECK (CHAR_LENGTH(TRIM(name)) > 0),
        CONSTRAINT CHK_pets_weight
          CHECK (weight_kg IS NULL OR weight_kg > 0)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE pet_vaccinations (
        id VARCHAR(64) NOT NULL,
        pet_id VARCHAR(64) NOT NULL,
        vaccine VARCHAR(120) NOT NULL,
        administered_at DATETIME(3) NOT NULL,
        expires_at DATETIME(3) NULL,
        document_url VARCHAR(500) NULL,
        document_blob LONGBLOB NULL,
        document_mime_type VARCHAR(100) NULL,
        document_name VARCHAR(255) NULL,
        document_size INT UNSIGNED NULL,
        PRIMARY KEY (id),
        KEY IDX_pet_vaccinations_pet_id (pet_id),
        CONSTRAINT FK_pet_vaccinations_pet
          FOREIGN KEY (pet_id) REFERENCES pets (id)
          ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT CHK_pet_vaccinations_vaccine
          CHECK (CHAR_LENGTH(TRIM(vaccine)) > 0),
        CONSTRAINT CHK_pet_vaccinations_dates
          CHECK (expires_at IS NULL OR expires_at >= administered_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE payments (
        id VARCHAR(64) NOT NULL,
        user_id VARCHAR(64) NULL,
        method VARCHAR(16) NOT NULL,
        status VARCHAR(16) NOT NULL,
        amount INT UNSIGNED NOT NULL,
        currency CHAR(3) NOT NULL DEFAULT 'COP',
        provider VARCHAR(32) NOT NULL,
        reference VARCHAR(160) NOT NULL,
        created_at DATETIME(3) NOT NULL,
        paid_at DATETIME(3) NULL,
        failure_reason VARCHAR(255) NULL,
        attempts INT UNSIGNED NOT NULL DEFAULT 0,
        PRIMARY KEY (id),
        UNIQUE KEY UQ_payments_reference (reference),
        KEY IDX_payments_user_status (user_id, status),
        CONSTRAINT FK_payments_user
          FOREIGN KEY (user_id) REFERENCES users (id)
          ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT CHK_payments_method
          CHECK (method IN ('online', 'at-location')),
        CONSTRAINT CHK_payments_status
          CHECK (status IN ('paid', 'pending', 'failed')),
        CONSTRAINT CHK_payments_amount
          CHECK (amount > 0),
        CONSTRAINT CHK_payments_currency
          CHECK (currency = 'COP'),
        CONSTRAINT CHK_payments_provider
          CHECK (provider = 'mock'),
        CONSTRAINT CHK_payments_reference
          CHECK (CHAR_LENGTH(TRIM(reference)) > 0)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE promotions (
        id VARCHAR(64) NOT NULL,
        name VARCHAR(160) NOT NULL,
        description VARCHAR(500) NOT NULL,
        discount_type VARCHAR(16) NOT NULL,
        discount_value DECIMAL(12,2) NOT NULL,
        scope VARCHAR(16) NOT NULL,
        city VARCHAR(120) NULL,
        provider_id VARCHAR(64) NULL,
        starts_at DATETIME(3) NOT NULL,
        ends_at DATETIME(3) NOT NULL,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        PRIMARY KEY (id),
        KEY IDX_promotions_active_dates (active, starts_at, ends_at),
        CONSTRAINT FK_promotions_provider
          FOREIGN KEY (provider_id) REFERENCES providers (id)
          ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT CHK_promotions_discount
          CHECK (
            (discount_type = 'percent' AND discount_value > 0 AND discount_value <= 100)
            OR (discount_type = 'fixed' AND discount_value > 0)
          ),
        CONSTRAINT CHK_promotions_scope
          CHECK (scope IN ('national', 'local')),
        CONSTRAINT CHK_promotions_text
          CHECK (
            CHAR_LENGTH(TRIM(name)) > 0
            AND CHAR_LENGTH(TRIM(description)) > 0
          ),
        CONSTRAINT CHK_promotions_dates
          CHECK (ends_at >= starts_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TRIGGER TRG_promotions_locality_insert
      BEFORE INSERT ON promotions
      FOR EACH ROW
      BEGIN
        IF NEW.scope = 'local'
          AND (
            NEW.city IS NULL
            OR CHAR_LENGTH(TRIM(NEW.city)) = 0
          )
        THEN
          SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Local promotions require city';
        END IF;
      END
    `);

    await queryRunner.query(`
      CREATE TRIGGER TRG_promotions_locality_update
      BEFORE UPDATE ON promotions
      FOR EACH ROW
      BEGIN
        IF NEW.scope = 'local'
          AND (
            NEW.city IS NULL
            OR CHAR_LENGTH(TRIM(NEW.city)) = 0
          )
        THEN
          SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Local promotions require city';
        END IF;
      END
    `);

    await queryRunner.query(`
      CREATE TABLE promotion_service_types (
        promotion_id VARCHAR(64) NOT NULL,
        service_type VARCHAR(32) NOT NULL,
        PRIMARY KEY (promotion_id, service_type),
        CONSTRAINT FK_promotion_service_types_promotion
          FOREIGN KEY (promotion_id) REFERENCES promotions (id)
          ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT CHK_promotion_service_types_type
          CHECK (
            service_type IN (
              'grooming',
              'walking',
              'boarding',
              'veterinary',
              'home-visit',
              'cleaning'
            )
          )
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE bookings (
        id VARCHAR(64) NOT NULL,
        user_id VARCHAR(64) NOT NULL,
        pet_id VARCHAR(64) NOT NULL,
        provider_id VARCHAR(64) NOT NULL,
        service_type VARCHAR(32) NOT NULL,
        visit_mode VARCHAR(20) NOT NULL,
        scheduled_at DATETIME(3) NOT NULL,
        address VARCHAR(255) NULL,
        address_reference VARCHAR(255) NULL,
        latitude DECIMAL(10,7) NULL,
        longitude DECIMAL(10,7) NULL,
        notes VARCHAR(500) NULL,
        status VARCHAR(20) NOT NULL,
        total INT UNSIGNED NOT NULL,
        original_total INT UNSIGNED NOT NULL,
        discount_amount INT UNSIGNED NOT NULL DEFAULT 0,
        currency CHAR(3) NOT NULL DEFAULT 'COP',
        payment_method VARCHAR(16) NOT NULL,
        payment_id VARCHAR(64) NOT NULL,
        payment_expires_at DATETIME(3) NULL,
        idempotency_key VARCHAR(100) NULL,
        promotion_id VARCHAR(64) NULL,
        rejection_reason VARCHAR(500) NULL,
        created_at DATETIME(3) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY UQ_bookings_payment_id (payment_id),
        UNIQUE KEY UQ_bookings_idempotency_key (idempotency_key),
        KEY IDX_bookings_user_id (user_id),
        KEY IDX_bookings_provider_date (provider_id, scheduled_at),
        KEY IDX_bookings_status_date (status, scheduled_at),
        KEY IDX_bookings_payment_expiry (status, payment_expires_at),
        CONSTRAINT FK_bookings_user
          FOREIGN KEY (user_id) REFERENCES users (id)
          ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT FK_bookings_pet
          FOREIGN KEY (pet_id) REFERENCES pets (id)
          ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT FK_bookings_provider
          FOREIGN KEY (provider_id) REFERENCES providers (id)
          ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT FK_bookings_payment
          FOREIGN KEY (payment_id) REFERENCES payments (id)
          ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT FK_bookings_promotion
          FOREIGN KEY (promotion_id) REFERENCES promotions (id)
          ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT CHK_bookings_service_type
          CHECK (
            service_type IN (
              'grooming',
              'walking',
              'boarding',
              'veterinary',
              'home-visit',
              'cleaning'
            )
          ),
        CONSTRAINT CHK_bookings_visit_mode
          CHECK (visit_mode IN ('pickup-dropoff', 'home-visit', 'at-location')),
        CONSTRAINT CHK_bookings_status
          CHECK (
            status IN (
              'pending',
              'pending-confirmation',
              'confirmed',
              'rejected',
              'in-progress',
              'completed',
              'cancelled'
            )
          ),
        CONSTRAINT CHK_bookings_total
          CHECK (total > 0),
        CONSTRAINT CHK_bookings_currency
          CHECK (currency = 'COP'),
        CONSTRAINT CHK_bookings_payment_method
          CHECK (payment_method IN ('online', 'at-location')),
        CONSTRAINT CHK_bookings_text
          CHECK (
            CHAR_LENGTH(TRIM(service_type)) > 0
            AND CHAR_LENGTH(TRIM(visit_mode)) > 0
          ),
        CONSTRAINT CHK_bookings_home_visit_address
          CHECK (
            visit_mode <> 'home-visit'
            OR (
              address IS NOT NULL
              AND CHAR_LENGTH(TRIM(address)) > 0
              AND address_reference IS NOT NULL
              AND CHAR_LENGTH(TRIM(address_reference)) > 0
              AND latitude BETWEEN -22.9 AND -9.6
              AND longitude BETWEEN -69.6 AND -57.4
            )
          )
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE notifications (
        id VARCHAR(64) NOT NULL,
        user_id VARCHAR(64) NOT NULL,
        booking_id VARCHAR(64) NULL,
        type VARCHAR(20) NOT NULL,
        message VARCHAR(500) NOT NULL,
        channel VARCHAR(32) NOT NULL,
        sent_at DATETIME(3) NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        PRIMARY KEY (id),
        KEY IDX_notifications_user_sent_at (user_id, sent_at),
        CONSTRAINT FK_notifications_user
          FOREIGN KEY (user_id) REFERENCES users (id)
          ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT FK_notifications_booking
          FOREIGN KEY (booking_id) REFERENCES bookings (id)
          ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT CHK_notifications_type
          CHECK (type IN ('confirmation', 'reminder', 'completion', 'rejection')),
        CONSTRAINT CHK_notifications_channel
          CHECK (channel = 'mock-push'),
        CONSTRAINT CHK_notifications_message
          CHECK (CHAR_LENGTH(TRIM(message)) > 0)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await createOnlineBookingPaymentTriggers(queryRunner);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await dropOnlineBookingPaymentTriggers(queryRunner);
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS TRG_promotions_locality_update',
    );
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS TRG_promotions_locality_insert',
    );
    await queryRunner.query('DROP TABLE notifications');
    await queryRunner.query('DROP TABLE bookings');
    await queryRunner.query('DROP TABLE promotion_service_types');
    await queryRunner.query('DROP TABLE promotions');
    await queryRunner.query('DROP TABLE payments');
    await queryRunner.query('DROP TABLE pet_vaccinations');
    await queryRunner.query('DROP TABLE pets');
    await queryRunner.query('DROP TABLE provider_schedules');
    await queryRunner.query('DROP TABLE provider_services');
    await queryRunner.query('DROP TABLE providers');
    await queryRunner.query('DROP TABLE users');
  }
}

async function createOnlineBookingPaymentTriggers(queryRunner: QueryRunner) {
  await queryRunner.query(`
    CREATE TRIGGER TRG_bookings_online_paid_insert
    BEFORE INSERT ON bookings
    FOR EACH ROW
    BEGIN
      DECLARE payment_status VARCHAR(16);
      IF NEW.payment_method = 'online'
         AND NEW.status IN (
           'pending-confirmation',
           'confirmed',
           'in-progress',
           'completed'
         ) THEN
        SELECT status INTO payment_status
        FROM payments
        WHERE id = NEW.payment_id
        LIMIT 1;
        IF payment_status IS NULL OR payment_status <> 'paid' THEN
          SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Online booking requires a paid payment';
        END IF;
      END IF;
    END
  `);
  await queryRunner.query(`
    CREATE TRIGGER TRG_bookings_online_paid_update
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    BEGIN
      DECLARE payment_status VARCHAR(16);
      IF NEW.payment_method = 'online'
         AND NEW.status IN (
           'pending-confirmation',
           'confirmed',
           'in-progress',
           'completed'
         ) THEN
        SELECT status INTO payment_status
        FROM payments
        WHERE id = NEW.payment_id
        LIMIT 1;
        IF payment_status IS NULL OR payment_status <> 'paid' THEN
          SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Online booking requires a paid payment';
        END IF;
      END IF;
    END
  `);
}

async function dropOnlineBookingPaymentTriggers(queryRunner: QueryRunner) {
  await queryRunner.query(
    'DROP TRIGGER IF EXISTS TRG_bookings_online_paid_update',
  );
  await queryRunner.query(
    'DROP TRIGGER IF EXISTS TRG_bookings_online_paid_insert',
  );
}
