import type { MigrationInterface, QueryRunner } from 'typeorm';

export class EnforceOnlinePaidBookings1770000000005 implements MigrationInterface {
  name = 'EnforceOnlinePaidBookings1770000000005';

  async up(queryRunner: QueryRunner): Promise<void> {
    await dropTriggers(queryRunner);
    await createTriggers(queryRunner);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await dropTriggers(queryRunner);
  }
}

async function createTriggers(queryRunner: QueryRunner) {
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

async function dropTriggers(queryRunner: QueryRunner) {
  await queryRunner.query(
    'DROP TRIGGER IF EXISTS TRG_bookings_online_paid_update',
  );
  await queryRunner.query(
    'DROP TRIGGER IF EXISTS TRG_bookings_online_paid_insert',
  );
}
