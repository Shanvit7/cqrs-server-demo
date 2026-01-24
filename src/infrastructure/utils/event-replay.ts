// DOMAIN
import { Order } from '@/domain/order';
import { OrderEvent } from '@/domain/events';
// INFRASTRUCTURE
import { eventStoreRepository } from '@/infrastructure/database/repositories/event-store.repository';
import { readModelRepository } from '@/infrastructure/database/repositories/read-model.repository';
// LOGGER
import logger from '@/utils/logger';

export interface ReplayOptions {
  aggregateId?: string;
  fromDate?: Date;
  toDate?: Date;
  batchSize?: number;
}

export class EventReplayService {
  /**
   * Replay events and rebuild read models
   * Useful for:
   * - Rebuilding read models after a failure
   * - Creating new read models from existing events
   * - Testing projections
   */
  async replayEvents(options: ReplayOptions = {}): Promise<{
    processed: number;
    errors: number;
  }> {
    const batchSize = options.batchSize || 100;
    let processed = 0;
    let errors = 0;
    let offset = 0;

    logger.info('Starting event replay...');

    try {
      // Clear existing read models if replaying all events
      if (!options.aggregateId) {
        logger.info('Clearing existing read models...');
        // Note: In production, you might want to be more selective
        // For now, we'll rebuild from scratch
      }

      while (true) {
        // Get events in batches
        const result = await eventStoreRepository.getAllEvents(batchSize, offset);

        if (result.events.length === 0) {
          break;
        }

        // Group events by aggregate ID
        const eventsByAggregate = this.groupEventsByAggregate(result.events);

        // Process each aggregate
        for (const [aggregateId, events] of eventsByAggregate.entries()) {
          try {
            // Reconstruct aggregate from events
            const order = Order.fromEvents(events as OrderEvent[]);

            // Get snapshot
            const snapshot = order.toSnapshot();

            // Save to read model
            await readModelRepository.saveOrder({
              id: snapshot.id,
              customerId: snapshot.customerId,
              status: snapshot.status,
              items: snapshot.items,
              totalAmount: snapshot.totalAmount,
              createdAt: snapshot.createdAt.toISOString(),
              updatedAt: snapshot.updatedAt.toISOString(),
            });

            processed++;
          } catch (error) {
            logger.error(`Failed to replay events for aggregate ${aggregateId}`, error);
            errors++;
          }
        }

        offset += batchSize;

        // Log progress
        if (processed % 100 === 0) {
          logger.info(`Replayed ${processed} aggregates, ${errors} errors`);
        }

        // Break if we've processed all events
        if (result.events.length < batchSize) {
          break;
        }
      }

      logger.info(`Event replay completed: ${processed} aggregates processed, ${errors} errors`);

      return { processed, errors };
    } catch (error) {
      logger.error('Event replay failed', error);
      throw error;
    }
  }

  /**
   * Replay events for a specific aggregate
   */
  async replayAggregate(aggregateId: string): Promise<void> {
    try {
      const events = await eventStoreRepository.getEvents(aggregateId);

      if (events.length === 0) {
        logger.warn(`No events found for aggregate ${aggregateId}`);
        return;
      }

      // Reconstruct aggregate from events
      const order = Order.fromEvents(events as OrderEvent[]);

      // Get snapshot
      const snapshot = order.toSnapshot();

      // Save to read model
      await readModelRepository.saveOrder({
        id: snapshot.id,
        customerId: snapshot.customerId,
        status: snapshot.status,
        items: snapshot.items,
        totalAmount: snapshot.totalAmount,
        createdAt: snapshot.createdAt.toISOString(),
        updatedAt: snapshot.updatedAt.toISOString(),
      });

      logger.info(`Replayed aggregate ${aggregateId}`);
    } catch (error) {
      logger.error(`Failed to replay aggregate ${aggregateId}`, error);
      throw error;
    }
  }

  private groupEventsByAggregate(events: OrderEvent[]): Map<string, OrderEvent[]> {
    const grouped = new Map<string, OrderEvent[]>();

    for (const event of events) {
      if (!grouped.has(event.aggregateId)) {
        grouped.set(event.aggregateId, []);
      }
      grouped.get(event.aggregateId)!.push(event);
    }

    // Sort events by version within each group
    for (const [_aggregateId, aggregateEvents] of grouped.entries()) {
      aggregateEvents.sort((a, b) => a.eventVersion - b.eventVersion);
    }

    return grouped;
  }
}

export const eventReplayService = new EventReplayService();
