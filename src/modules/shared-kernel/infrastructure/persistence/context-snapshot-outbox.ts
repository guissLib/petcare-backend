import { randomUUID } from 'node:crypto';
import type { EntityManager } from 'typeorm';
import type {
  ContextSnapshotEnvelope,
  ContextSnapshotEventType,
} from '../messaging/context-snapshot.types';
import { IntegrationOutboxOrmEntity } from './entities/integration-outbox.orm-entity';

interface EnqueueContextSnapshotInput {
  eventType: ContextSnapshotEventType;
  aggregateType: 'user' | 'pet' | 'provider' | 'promotion';
  aggregateId: string;
  data: object;
}

export async function enqueueContextSnapshot(
  manager: EntityManager,
  input: EnqueueContextSnapshotInput,
): Promise<ContextSnapshotEnvelope> {
  await manager.query(
    `
      INSERT INTO context_snapshot_versions
        (aggregate_type, aggregate_id, version, updated_at)
      VALUES (?, ?, 1, CURRENT_TIMESTAMP(3))
      ON DUPLICATE KEY UPDATE
        version = version + 1,
        updated_at = CURRENT_TIMESTAMP(3)
    `,
    [input.aggregateType, input.aggregateId],
  );
  const queryResult: unknown = await manager.query(
    `
      SELECT version
      FROM context_snapshot_versions
      WHERE aggregate_type = ? AND aggregate_id = ?
      FOR UPDATE
    `,
    [input.aggregateType, input.aggregateId],
  );
  const aggregateVersion = readVersion(queryResult);
  if (!Number.isSafeInteger(aggregateVersion) || aggregateVersion < 1) {
    throw new Error('No se pudo asignar la versión del snapshot de contexto');
  }

  const now = new Date();
  const envelope: ContextSnapshotEnvelope = {
    eventId: randomUUID(),
    eventType: input.eventType,
    schemaVersion: 1,
    sourceService: 'petcare-backend',
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    aggregateVersion,
    occurredAt: now.toISOString(),
    data: input.data,
  };
  await manager.getRepository(IntegrationOutboxOrmEntity).insert({
    id: envelope.eventId,
    eventType: envelope.eventType,
    schemaVersion: envelope.schemaVersion,
    sourceService: envelope.sourceService,
    aggregateType: envelope.aggregateType,
    aggregateId: envelope.aggregateId,
    aggregateVersion: String(envelope.aggregateVersion),
    occurredAt: now,
    data: envelope.data,
    status: 'pending',
    attempts: 0,
    nextAttemptAt: now,
    lockedAt: null,
    lockedBy: null,
    publishedAt: null,
    lastError: null,
    createdAt: now,
  });
  return envelope;
}

function readVersion(result: unknown) {
  if (!Array.isArray(result)) {
    return Number.NaN;
  }
  const rows: unknown[] = result;
  const first = rows.at(0);
  if (!first || typeof first !== 'object' || !('version' in first)) {
    return Number.NaN;
  }
  const version: unknown = first.version;
  return typeof version === 'string' || typeof version === 'number'
    ? Number(version)
    : Number.NaN;
}
