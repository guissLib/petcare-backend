import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ApplyImprovedRequirements1770000000002 implements MigrationInterface {
  name = 'ApplyImprovedRequirements1770000000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    await this.ensureServiceTypeCheck(
      queryRunner,
      'provider_services',
      'CHK_provider_services_type',
      'service_type',
    );
    await this.ensureServiceTypeCheck(
      queryRunner,
      'promotion_service_types',
      'CHK_promotion_service_types_type',
      'service_type',
    );
    await this.ensureServiceTypeCheck(
      queryRunner,
      'bookings',
      'CHK_bookings_service_type',
      'service_type',
    );

    if (await queryRunner.hasColumn('promotions', 'discount_percent')) {
      await queryRunner.query(
        'ALTER TABLE promotions DROP CHECK CHK_promotions_discount',
      );
      await queryRunner.query(`
        ALTER TABLE promotions
          ADD COLUMN discount_type VARCHAR(16) NOT NULL DEFAULT 'percent',
          ADD COLUMN discount_value DECIMAL(12,2) NOT NULL DEFAULT 0
      `);
      await queryRunner.query(`
        UPDATE promotions
        SET discount_value = CASE
              WHEN discount_percent > 0 THEN discount_percent
              ELSE 1
            END,
            discount_type = 'percent',
            active = CASE
              WHEN discount_percent > 0 THEN active
              ELSE FALSE
            END
      `);
      await queryRunner.query(
        'ALTER TABLE promotions DROP COLUMN discount_percent',
      );
      await queryRunner.query(`
        ALTER TABLE promotions
          ADD CONSTRAINT CHK_promotions_discount CHECK (
            (discount_type = 'percent' AND discount_value > 0 AND discount_value <= 100)
            OR (discount_type = 'fixed' AND discount_value > 0)
          )
      `);
    }

    if (!(await queryRunner.hasColumn('pet_vaccinations', 'document_blob'))) {
      await queryRunner.query(`
        ALTER TABLE pet_vaccinations
          ADD COLUMN document_blob LONGBLOB NULL,
          ADD COLUMN document_mime_type VARCHAR(100) NULL,
          ADD COLUMN document_name VARCHAR(255) NULL,
          ADD COLUMN document_size INT UNSIGNED NULL
      `);
    }

    if (!(await queryRunner.hasColumn('bookings', 'original_total'))) {
      await queryRunner.query(`
        ALTER TABLE bookings
          ADD COLUMN original_total INT UNSIGNED NOT NULL DEFAULT 0,
          ADD COLUMN discount_amount INT UNSIGNED NOT NULL DEFAULT 0
      `);
      await queryRunner.query(`
        UPDATE bookings
        SET original_total = total,
            discount_amount = 0
        WHERE original_total = 0
      `);
    }

    if (!(await queryRunner.hasColumn('bookings', 'address_reference'))) {
      await queryRunner.query(`
        ALTER TABLE bookings
          ADD COLUMN address_reference VARCHAR(255) NULL,
          ADD COLUMN latitude DECIMAL(10,7) NULL,
          ADD COLUMN longitude DECIMAL(10,7) NULL
      `);
    }

    await queryRunner.query(`
      UPDATE bookings
      SET address = COALESCE(
            NULLIF(TRIM(address), ''),
            'Dirección pendiente de validar'
          ),
          address_reference = COALESCE(
            NULLIF(TRIM(address_reference), ''),
            'Ubicación migrada; confirmar con el cliente'
          ),
          latitude = CASE
            WHEN latitude BETWEEN -22.9 AND -9.6 THEN latitude
            ELSE NULL
          END,
          longitude = CASE
            WHEN longitude BETWEEN -69.6 AND -57.4 THEN longitude
            ELSE NULL
          END
      WHERE visit_mode = 'home-visit'
    `);

    await queryRunner.query(`
      UPDATE bookings
      SET visit_mode = 'at-location',
          notes = CONCAT_WS(
            ' | ',
            NULLIF(TRIM(notes), ''),
            'Modalidad de domicilio migrada; requiere confirmar ubicación'
          )
      WHERE visit_mode = 'home-visit'
        AND (
          latitude IS NULL
          OR longitude IS NULL
          OR address_reference IS NULL
          OR CHAR_LENGTH(TRIM(address_reference)) = 0
        )
    `);

    await this.ensureHomeVisitCheck(queryRunner);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE bookings DROP CHECK CHK_bookings_home_visit_address',
    );
    if (await queryRunner.hasColumn('bookings', 'address_reference')) {
      await queryRunner.query(`
        ALTER TABLE bookings
          DROP COLUMN address_reference,
          DROP COLUMN latitude,
          DROP COLUMN longitude
      `);
    }
    if (await queryRunner.hasColumn('bookings', 'original_total')) {
      await queryRunner.query(`
        ALTER TABLE bookings
          DROP COLUMN original_total,
          DROP COLUMN discount_amount
      `);
    }
    if (await queryRunner.hasColumn('pet_vaccinations', 'document_blob')) {
      await queryRunner.query(`
        ALTER TABLE pet_vaccinations
          DROP COLUMN document_blob,
          DROP COLUMN document_mime_type,
          DROP COLUMN document_name,
          DROP COLUMN document_size
      `);
    }
    if (await queryRunner.hasColumn('promotions', 'discount_type')) {
      await queryRunner.query(
        'ALTER TABLE promotions DROP CHECK CHK_promotions_discount',
      );
      await queryRunner.query(`
        ALTER TABLE promotions
          ADD COLUMN discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0
      `);
      await queryRunner.query(`
        UPDATE promotions
        SET discount_percent =
          CASE
            WHEN discount_type = 'percent' THEN discount_value
            ELSE 0
          END
      `);
      await queryRunner.query(`
        ALTER TABLE promotions
          DROP COLUMN discount_type,
          DROP COLUMN discount_value,
          ADD CONSTRAINT CHK_promotions_discount
            CHECK (discount_percent BETWEEN 0 AND 100)
      `);
    }
  }

  private async ensureServiceTypeCheck(
    queryRunner: QueryRunner,
    tableName: string,
    constraintName: string,
    serviceColumn: string,
  ) {
    if (!(await queryRunner.hasTable(tableName))) {
      return;
    }
    const check = await this.findCheckConstraint(
      queryRunner,
      tableName,
      constraintName,
    );
    if (check.definition?.toLowerCase().includes("'cleaning'")) {
      return;
    }
    if (check.exists) {
      await queryRunner.query(
        `ALTER TABLE ${tableName} DROP CHECK ${constraintName}`,
      );
    }
    await queryRunner.query(`
      ALTER TABLE ${tableName}
        ADD CONSTRAINT ${constraintName} CHECK (
          ${serviceColumn} IN (
            'grooming',
            'walking',
            'boarding',
            'veterinary',
            'home-visit',
            'cleaning'
          )
        )
    `);
  }

  private async ensureHomeVisitCheck(queryRunner: QueryRunner) {
    const check = await this.findCheckConstraint(
      queryRunner,
      'bookings',
      'CHK_bookings_home_visit_address',
    );
    if (check.definition?.toLowerCase().includes('address_reference')) {
      return;
    }
    if (check.exists) {
      await queryRunner.query(
        'ALTER TABLE bookings DROP CHECK CHK_bookings_home_visit_address',
      );
    }
    await queryRunner.query(`
      ALTER TABLE bookings
        ADD CONSTRAINT CHK_bookings_home_visit_address CHECK (
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
    `);
  }

  private async findCheckConstraint(
    queryRunner: QueryRunner,
    tableName: string,
    constraintName: string,
  ) {
    if (!(await queryRunner.hasTable(tableName))) {
      return { exists: false, definition: undefined };
    }
    const rows = (await queryRunner.query(
      `SHOW CREATE TABLE \`${tableName}\``,
    )) as Array<Record<string, unknown>>;
    const row = rows[0];
    const createValue = row?.['Create Table'];
    const fallbackValue = Object.values(row ?? {}).find(
      (value): value is string => typeof value === 'string',
    );
    const createStatement =
      (typeof createValue === 'string' ? createValue : fallbackValue) ?? '';
    const start = createStatement.indexOf(constraintName);
    if (start < 0) {
      return { exists: false, definition: undefined };
    }
    const nextConstraint = createStatement.indexOf(
      'CONSTRAINT',
      start + constraintName.length,
    );
    return {
      exists: true,
      definition: createStatement.slice(
        start,
        nextConstraint >= 0 ? nextConstraint : createStatement.length,
      ),
    };
  }
}
