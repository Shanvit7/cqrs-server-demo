// DOMAIN
import { DomainEvent, OrderEvent } from '@/domain/events';
// INFRASTRUCTURE
import { postgresPool } from '@/infrastructure/database/postgres';
// LOGGER
import logger from '@/utils/logger';

export interface StoredEvent {
  id: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  eventVersion: number;
  payload: unknown;
  metadata: unknown;
  createdAt: Date;
}

export class EventStoreRepository {
  async appendEvents(
    aggregateId: string,
    aggregateType: string,
    events: DomainEvent[],
    expectedVersion: number,
  ): Promise<void> {
    const client = await postgresPool.connect();

    try {
      await client.query('BEGIN');

      // Check optimistic concurrency control
      const versionCheck = await client.query(
        'SELECT MAX(event_version) as max_version FROM event_store WHERE aggregate_id = $1',
        [aggregateId],
      );

      const currentVersion =
        versionCheck.rows[0]?.max_version !== null
          ? parseInt(versionCheck.rows[0].max_version, 10)
          : -1;

      if (currentVersion !== expectedVersion) {
        throw new Error(
          `Concurrency conflict: Expected version ${expectedVersion}, but current version is ${currentVersion}`,
        );
      }

      // Insert events
      for (const event of events) {
        await client.query(
          `INSERT INTO event_store 
           (aggregate_id, aggregate_type, event_type, event_version, payload, metadata, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            aggregateId,
            aggregateType,
            event.eventType,
            event.eventVersion,
            JSON.stringify(event.payload),
            event.metadata ? JSON.stringify(event.metadata) : null,
            event.occurredAt,
          ],
        );
      }

      await client.query('COMMIT');
      logger.info(`Appended ${events.length} events for aggregate ${aggregateId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to append events', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getEvents(aggregateId: string): Promise<OrderEvent[]> {
    try {
      const result = await postgresPool.query(
        `SELECT * FROM event_store 
         WHERE aggregate_id = $1 
         ORDER BY event_version ASC`,
        [aggregateId],
      );

      return result.rows.map((row: StoredEvent) => this.mapRowToEvent(row));
    } catch (error) {
      logger.error('Failed to get events', error);
      throw error;
    }
  }

  async getEventsByType(eventType: string): Promise<OrderEvent[]> {
    try {
      const result = await postgresPool.query(
        `SELECT * FROM event_store 
         WHERE event_type = $1 
         ORDER BY created_at ASC`,
        [eventType],
      );

      return result.rows.map((row: StoredEvent) => this.mapRowToEvent(row));
    } catch (error) {
      logger.error('Failed to get events by type', error);
      throw error;
    }
  }

  async getAllEvents(
    limit?: number,
    offset?: number,
  ): Promise<{ events: OrderEvent[]; total: number }> {
    try {
      const countResult = await postgresPool.query('SELECT COUNT(*) as total FROM event_store');
      const total = parseInt(countResult.rows[0].total, 10);

      const query = limit
        ? `SELECT * FROM event_store ORDER BY created_at ASC LIMIT $1 OFFSET $2`
        : `SELECT * FROM event_store ORDER BY created_at ASC`;

      const params = limit ? [limit, offset || 0] : [];
      const result = await postgresPool.query(query, params);

      return {
        events: result.rows.map((row: StoredEvent) => this.mapRowToEvent(row)),
        total,
      };
    } catch (error) {
      logger.error('Failed to get all events', error);
      throw error;
    }
  }

  private mapRowToEvent(row: StoredEvent): OrderEvent {
    return {
      eventId: row.id,
      aggregateId: row.aggregateId,
      eventType: row.eventType as OrderEvent['eventType'],
      eventVersion: row.eventVersion,
      occurredAt: row.createdAt,
      payload: row.payload,
      metadata: row.metadata as DomainEvent['metadata'],
    } as OrderEvent;
  }
}

export const eventStoreRepository = new EventStoreRepository();
