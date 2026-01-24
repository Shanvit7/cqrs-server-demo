// DOMAIN
import {
  DomainEvent,
  isOrderCreatedEvent,
  isOrderStatusUpdatedEvent,
  isOrderCancelledEvent,
} from '@/domain/events';
// INFRASTRUCTURE
import { readModelRepository } from '@/infrastructure/database/repositories/read-model.repository';
import { eventBus } from '@/infrastructure/event-bus';
// LOGGER
import logger from '@/utils/logger';

class OrderProjection {
  private initialized = false;

  initialize(): void {
    if (this.initialized) {
      return;
    }

    // Subscribe to order events
    eventBus.subscribe('OrderCreated', this.handleOrderCreated.bind(this));
    eventBus.subscribe('OrderStatusUpdated', this.handleOrderStatusUpdated.bind(this));
    eventBus.subscribe('OrderCancelled', this.handleOrderCancelled.bind(this));

    this.initialized = true;
    logger.info('Order projection initialized');
  }

  private async handleOrderCreated(event: DomainEvent): Promise<void> {
    if (!isOrderCreatedEvent(event)) {
      return;
    }

    try {
      const order = {
        id: event.aggregateId,
        customerId: event.payload.customerId,
        status: 'pending' as const,
        items: event.payload.items,
        totalAmount: event.payload.totalAmount,
        createdAt: event.occurredAt.toISOString(),
        updatedAt: event.occurredAt.toISOString(),
      };

      await readModelRepository.saveOrder(order);
      logger.info(`Projected OrderCreated event for order ${event.aggregateId}`);
    } catch (error) {
      logger.error('Failed to project OrderCreated event', error);
      throw error;
    }
  }

  private async handleOrderStatusUpdated(event: DomainEvent): Promise<void> {
    if (!isOrderStatusUpdatedEvent(event)) {
      return;
    }

    try {
      await readModelRepository.updateOrderStatus(
        event.aggregateId,
        event.payload.status,
        event.occurredAt.toISOString(),
      );
      logger.info(`Projected OrderStatusUpdated event for order ${event.aggregateId}`);
    } catch (error) {
      logger.error('Failed to project OrderStatusUpdated event', error);
      throw error;
    }
  }

  private async handleOrderCancelled(event: DomainEvent): Promise<void> {
    if (!isOrderCancelledEvent(event)) {
      return;
    }

    try {
      await readModelRepository.updateOrderStatus(
        event.aggregateId,
        'cancelled',
        event.occurredAt.toISOString(),
      );
      logger.info(`Projected OrderCancelled event for order ${event.aggregateId}`);
    } catch (error) {
      logger.error('Failed to project OrderCancelled event', error);
      throw error;
    }
  }
}

export const orderProjection = new OrderProjection();
