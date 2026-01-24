// TYPES
import type { CreateOrderCommand } from '@/schemas/order.schema';
// DOMAIN
import { Order } from '@/domain/order';
// INFRASTRUCTURE
import { eventStoreRepository } from '@/infrastructure/database/repositories/event-store.repository';
import { eventBus } from '@/infrastructure/event-bus';
// LOGGER
import logger from '@/utils/logger';

export class CreateOrderHandler {
  async handle(command: CreateOrderCommand): Promise<{ orderId: string }> {
    try {
      // Create order aggregate
      const order = Order.create(command.customerId, command.items, command.totalAmount);

      const orderId = order.getId();
      const events = order.getUncommittedEvents();

      // Save events to event store
      await eventStoreRepository.appendEvents(
        orderId,
        'Order',
        events,
        -1, // New aggregate, no previous version
      );

      // Mark events as committed
      order.markEventsAsCommitted();

      // Publish events to event bus
      await eventBus.publishMany(events);

      logger.info(`Order ${orderId} created successfully`);

      return { orderId };
    } catch (error) {
      logger.error('Failed to create order', error);
      throw error;
    }
  }
}

export const createOrderHandler = new CreateOrderHandler();
