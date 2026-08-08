import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPendingConfirmationStatus1770000000006 implements MigrationInterface {
  name = 'AddPendingConfirmationStatus1770000000006';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE bookings DROP CHECK CHK_bookings_status',
    );
    await queryRunner.query(`
      ALTER TABLE bookings
      ADD CONSTRAINT CHK_bookings_status
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
      )
    `);
    await replaceTriggers(queryRunner, true);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE bookings DROP CHECK CHK_bookings_status',
    );
    await queryRunner.query(`
      ALTER TABLE bookings
      ADD CONSTRAINT CHK_bookings_status
      CHECK (
        status IN (
          'pending',
          'confirmed',
          'rejected',
          'in-progress',
          'completed',
          'cancelled'
        )
      )
    `);
    await replaceTriggers(queryRunner, false);
  }
}

async function replaceTriggers(
  queryRunner: QueryRunner,
  includePendingConfirmation: boolean,
) {
  await queryRunner.query(
    'DROP TRIGGER IF EXISTS TRG_bookings_online_paid_update',
  );
  await queryRunner.query(
    'DROP TRIGGER IF EXISTS TRG_bookings_online_paid_insert',
  );
  const statuses = includePendingConfirmation
    ? "'pending-confirmation', 'confirmed', 'in-progress', 'completed'"
    : "'confirmed', 'in-progress', 'completed'";
  await queryRunner.query(`
    CREATE TRIGGER TRG_bookings_online_paid_insert
    BEFORE INSERT ON bookings
    FOR EACH ROW
    BEGIN
      DECLARE payment_status VARCHAR(16);
      IF NEW.payment_method = 'online'
         AND NEW.status IN (${statuses}) THEN
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
         AND NEW.status IN (${statuses}) THEN
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
