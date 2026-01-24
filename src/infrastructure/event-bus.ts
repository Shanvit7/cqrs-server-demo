// DOMAIN
import { DomainEvent } from '@/domain/events';
// LOGGER
import logger from '@/utils/logger';

export type EventHandler = (event: DomainEvent) => Promise<void> | void;

class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();

  subscribe(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
    logger.info(`Subscribed handler for event type: ${eventType}`);
  }

  unsubscribe(eventType: string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
        logger.info(`Unsubscribed handler for event type: ${eventType}`);
      }
    }
  }

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventType) || [];
    const allHandlers = this.handlers.get('*') || []; // Wildcard handlers

    logger.info(
      `Publishing event ${event.eventType} to ${handlers.length + allHandlers.length} handlers`,
    );

    // Execute specific handlers
    for (const handler of handlers) {
      try {
        await Promise.resolve(handler(event));
      } catch (error) {
        logger.error(`Error in handler for event ${event.eventType}`, error);
        // Continue with other handlers even if one fails
      }
    }

    // Execute wildcard handlers
    for (const handler of allHandlers) {
      try {
        await Promise.resolve(handler(event));
      } catch (error) {
        logger.error(`Error in wildcard handler for event ${event.eventType}`, error);
        // Continue with other handlers even if one fails
      }
    }
  }

  async publishMany(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  clear(): void {
    this.handlers.clear();
    logger.info('Event bus cleared');
  }
}

export const eventBus = new EventBus();
