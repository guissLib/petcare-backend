import type { MigrationInterface, QueryRunner } from 'typeorm';

export class EnforceLocalPromotionCity1770000000003 implements MigrationInterface {
  name = 'EnforceLocalPromotionCity1770000000003';

  async up(queryRunner: QueryRunner): Promise<void> {
    await this.replaceLocalityTrigger(queryRunner, 'insert');
    await this.replaceLocalityTrigger(queryRunner, 'update');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS TRG_promotions_locality_insert',
    );
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS TRG_promotions_locality_update',
    );
    await queryRunner.query(`
      CREATE TRIGGER TRG_promotions_locality_insert
      BEFORE INSERT ON promotions
      FOR EACH ROW
      BEGIN
        IF NEW.scope = 'local'
          AND (
            (NEW.city IS NULL OR CHAR_LENGTH(TRIM(NEW.city)) = 0)
            AND (NEW.provider_id IS NULL OR CHAR_LENGTH(TRIM(NEW.provider_id)) = 0)
          )
        THEN
          SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Local promotions require city or provider_id';
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
            (NEW.city IS NULL OR CHAR_LENGTH(TRIM(NEW.city)) = 0)
            AND (NEW.provider_id IS NULL OR CHAR_LENGTH(TRIM(NEW.provider_id)) = 0)
          )
        THEN
          SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Local promotions require city or provider_id';
        END IF;
      END
    `);
  }

  private async replaceLocalityTrigger(
    queryRunner: QueryRunner,
    operation: 'insert' | 'update',
  ) {
    const suffix = operation === 'insert' ? 'insert' : 'update';
    const timing = operation === 'insert' ? 'INSERT' : 'UPDATE';
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS TRG_promotions_locality_${suffix}`,
    );
    await queryRunner.query(`
      CREATE TRIGGER TRG_promotions_locality_${suffix}
      BEFORE ${timing} ON promotions
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
  }
}
