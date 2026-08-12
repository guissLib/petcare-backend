import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContextIntegrationOutbox1770000000010 implements MigrationInterface {
  name = 'AddContextIntegrationOutbox1770000000010';

  async up(queryRunner: QueryRunner) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS context_snapshot_versions (
        aggregate_type VARCHAR(32) NOT NULL,
        aggregate_id VARCHAR(64) NOT NULL,
        version BIGINT UNSIGNED NOT NULL,
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
          ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (aggregate_type, aggregate_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS integration_outbox (
        id VARCHAR(64) NOT NULL,
        event_type VARCHAR(64) NOT NULL,
        schema_version TINYINT UNSIGNED NOT NULL,
        source_service VARCHAR(64) NOT NULL,
        aggregate_type VARCHAR(32) NOT NULL,
        aggregate_id VARCHAR(64) NOT NULL,
        aggregate_version BIGINT UNSIGNED NOT NULL,
        occurred_at DATETIME(3) NOT NULL,
        data JSON NOT NULL,
        status VARCHAR(16) NOT NULL DEFAULT 'pending',
        attempts INT UNSIGNED NOT NULL DEFAULT 0,
        next_attempt_at DATETIME(3) NOT NULL,
        locked_at DATETIME(3) NULL,
        locked_by VARCHAR(128) NULL,
        published_at DATETIME(3) NULL,
        last_error TEXT NULL,
        created_at DATETIME(3) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY UQ_integration_outbox_aggregate_version
          (event_type, aggregate_id, aggregate_version),
        KEY IDX_integration_outbox_delivery (status, next_attempt_at),
        CONSTRAINT CHK_integration_outbox_schema_version
          CHECK (schema_version = 1),
        CONSTRAINT CHK_integration_outbox_status
          CHECK (status IN ('pending', 'processing', 'published'))
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async down(queryRunner: QueryRunner) {
    await queryRunner.query('DROP TABLE IF EXISTS integration_outbox');
    await queryRunner.query('DROP TABLE IF EXISTS context_snapshot_versions');
  }
}
