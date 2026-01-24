// TYPES
import type { ListOrdersQuery } from '@/schemas/order.schema';

// INFRASTRUCTURE
import { readModelRepository } from '@/infrastructure/database/repositories/read-model.repository';

// UTILS
import logger from '@/utils/logger';

export class ListOrdersHandler {
  async handle(query: ListOrdersQuery) {
    try {
      const result = await readModelRepository.listOrders({
        page: query.page,
        limit: query.limit,
        status: query.status,
        customerId: query.customerId,
      });

      return result;
    } catch (error) {
      logger.error('Failed to list orders', error);
      throw error;
    }
  }
}

export const listOrdersHandler = new ListOrdersHandler();
