// TYPES
import type { GetOrderQuery } from '@/schemas/order.schema';

// INFRASTRUCTURE
import { readModelRepository } from '@/infrastructure/database/repositories/read-model.repository';

// UTILS
import logger from '@/utils/logger';

export class GetOrderHandler {
  async handle(query: GetOrderQuery) {
    try {
      const order = await readModelRepository.getOrderById(query.orderId);

      if (!order) {
        throw new Error(`Order ${query.orderId} not found`);
      }

      return order;
    } catch (error) {
      logger.error('Failed to get order', error);
      throw error;
    }
  }
}

export const getOrderHandler = new GetOrderHandler();
