// TYPES
import type { UpdateOrderStatusCommand } from '@/schemas/order.schema';
// DOMAIN
import { Order } from '@/domain/order';
// INFRASTRUCTURE
import { eventStoreRepository } from '@/infrastructure/database/repositories/event-store.repository';
import { eventBus } from '@/infrastructure/event-bus';
// LOGGER
import logger from '@/utils/logger';

export class UpdateOrderStatusHandler {
  async handle(command: UpdateOrderStatusCommand): Promise<{ orderId: string; status: string }> {
    try {
      // Load events from event store
      const events = await eventStoreRepository.getEvents(command.orderId);

      if (events.length === 0) {
        throw new Error(`Order ${command.orderId} not found`);
      }

      // Reconstruct aggregate from events
      const order = Order.fromEvents(events);

      // Update status
      order.updateStatus(command.status);

      const newEvents = order.getUncommittedEvents();

      if (newEvents.length === 0) {
        // No change, return current state
        return {
          orderId: order.getId(),
          status: order.getStatus(),
        };
      }

      // Save new events to event store
      await eventStoreRepository.appendEvents(
        order.getId(),
        'Order',
        newEvents,
        order.getVersion(),
      );

      // Mark events as committed
      order.markEventsAsCommitted();

      // Publish events to event bus
      await eventBus.publishMany(newEvents);

      logger.info(`Order ${command.orderId} status updated to ${command.status}`);

      return {
        orderId: order.getId(),
        status: order.getStatus(),
      };
    } catch (error) {
      logger.error('Failed to update order status', error);
      throw error;
    }
  }
}

export const updateOrderStatusHandler = new UpdateOrderStatusHandler();
