// DOMAIN
import { DomainEvent, OrderEvent } from '@/domain/events';
// INFRASTRUCTURE
import { postgresPool } from '@/infrastructure/database/postgres';
// LOGGER
import logger from '@/utils/logger';

/** Raw row from PostgreSQL (snake_case column names) */
export interface RawEventRow {
  id: string;
  aggregate_id: string;
  aggregate_type: string;
  event_type: string;
  event_version: number;
  payload: unknown;
  metadata: unknown;
  created_at: Date | string;
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

      return result.rows.map((row: RawEventRow) => this.mapRowToEvent(row));
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

      return result.rows.map((row: RawEventRow) => this.mapRowToEvent(row));
    } catch (error) {
      logger.error('Failed to get events by type', error);
      throw error;
    }
  }

  async getAllEvents(
    options: {
      limit?: number;
      offset?: number;
      eventType?: string;
      aggregateId?: string;
      fromDate?: Date;
      toDate?: Date;
    } = {},
  ): Promise<{ events: OrderEvent[]; total: number }> {
    try {
      const { limit, offset, eventType, aggregateId, fromDate, toDate } = options;

      // Build WHERE clause
      const conditions: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (eventType) {
        conditions.push(`event_type = $${paramIndex}`);
        params.push(eventType);
        paramIndex++;
      }

      if (aggregateId) {
        conditions.push(`aggregate_id = $${paramIndex}`);
        params.push(aggregateId);
        paramIndex++;
      }

      if (fromDate) {
        conditions.push(`created_at >= $${paramIndex}`);
        params.push(fromDate);
        paramIndex++;
      }

      if (toDate) {
        conditions.push(`created_at <= $${paramIndex}`);
        params.push(toDate);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Count total
      const countQuery = `SELECT COUNT(*) as total FROM event_store ${whereClause}`;
      const countResult = await postgresPool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total, 10);

      // Get events
      let query = `SELECT * FROM event_store ${whereClause} ORDER BY created_at ASC`;
      if (limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(limit);
        paramIndex++;
        if (offset !== undefined) {
          query += ` OFFSET $${paramIndex}`;
          params.push(offset);
        }
      }

      const result = await postgresPool.query(query, params);

      return {
        events: result.rows.map((row: RawEventRow) => this.mapRowToEvent(row)),
        total,
      };
    } catch (error) {
      logger.error('Failed to get all events', error);
      throw error;
    }
  }

  private mapRowToEvent(row: RawEventRow): OrderEvent {
    // PostgreSQL returns snake_case; parse payload
    const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;

    const occurredAt = row.created_at instanceof Date ? row.created_at : new Date(row.created_at);
    const occurredAtISO = occurredAt.toISOString();

    // Parse stored metadata if present (JSONB is usually already an object)
    const storedMetadata =
      row.metadata == null
        ? undefined
        : typeof row.metadata === 'string'
          ? (JSON.parse(row.metadata) as DomainEvent['metadata'])
          : (row.metadata as DomainEvent['metadata']);

    // Always expose orderId, eventType, occurredAt for frontend; never null
    const metadata: DomainEvent['metadata'] & {
      orderId: string;
      eventType: string;
      occurredAt: string;
    } = {
      orderId: row.aggregate_id,
      eventType: row.event_type,
      occurredAt: occurredAtISO,
      ...storedMetadata,
    };

    return {
      eventId: row.id,
      aggregateId: row.aggregate_id,
      eventType: row.event_type as OrderEvent['eventType'],
      eventVersion: row.event_version,
      occurredAt,
      payload,
      metadata,
    } as OrderEvent;
  }
}

export const eventStoreRepository = new EventStoreRepository();
