import { toContextPetSnapshot } from '../../../src/modules/shared-kernel/infrastructure/messaging/context-snapshot.mapper';
import {
  IntegrationOutboxOrmEntity,
  toContextSnapshotEnvelope,
} from '../../../src/modules/shared-kernel/infrastructure/persistence/entities/integration-outbox.orm-entity';

describe('context snapshots', () => {
  it('redacts vaccination documents while retaining safe metadata', () => {
    const source = {
      id: 'pet-1',
      ownerId: 'user-1',
      vaccinationRecords: [
        {
          id: 'vax-1',
          vaccine: 'rabies',
          administeredAt: '2026-01-01T00:00:00.000Z',
          expiresAt: '2027-01-01T00:00:00.000Z',
          documentMimeType: 'application/pdf',
          documentBlob: Buffer.from('private'),
          documentName: 'private.pdf',
          documentSize: 7,
          documentUrl: '/private',
        },
      ],
    };
    const snapshot = toContextPetSnapshot(source);

    expect(snapshot).toEqual({
      id: 'pet-1',
      ownerId: 'user-1',
      vaccinationRecords: [
        {
          id: 'vax-1',
          vaccine: 'rabies',
          administeredAt: '2026-01-01T00:00:00.000Z',
          expiresAt: '2027-01-01T00:00:00.000Z',
          documentMimeType: 'application/pdf',
        },
      ],
    });
    expect(JSON.stringify(snapshot)).not.toContain('private');
  });

  it('keeps the same event identity and aggregate version across retries', () => {
    const record = Object.assign(new IntegrationOutboxOrmEntity(), {
      id: 'event-1',
      eventType: 'context.user.upserted' as const,
      aggregateType: 'user',
      aggregateId: 'user-1',
      aggregateVersion: '4',
      occurredAt: new Date('2026-08-12T12:00:00.000Z'),
      data: { id: 'user-1', city: 'Bogota' },
      attempts: 3,
    });

    const firstAttempt = toContextSnapshotEnvelope(record);
    record.attempts += 1;
    const retry = toContextSnapshotEnvelope(record);

    expect(retry).toEqual(firstAttempt);
    expect(retry.eventId).toBe('event-1');
    expect(retry.aggregateVersion).toBe(4);
  });
});
