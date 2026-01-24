// TYPES
import type { OrderStatus } from '@/schemas/order.schema';
// INFRASTRUCTURE
import { redis } from '@/infrastructure/database/redis';
// LOGGER
import logger from '@/utils/logger';

export interface OrderReadModel {
  id: string;
  customerId: string;
  status: OrderStatus;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

export class ReadModelRepository {
  private getOrderKey(orderId: string): string {
    return `order:${orderId}`;
  }

  private getStatusSetKey(status: OrderStatus): string {
    return `orders:by_status:${status}`;
  }

  private getCustomerSetKey(customerId: string): string {
    return `orders:by_customer:${customerId}`;
  }

  private getAllOrdersSetKey(): string {
    return 'orders:all';
  }

  async saveOrder(order: OrderReadModel): Promise<void> {
    try {
      const orderKey = this.getOrderKey(order.id);
      const timestamp = Date.now();

      // Store order as hash
      await redis.hset(orderKey, {
        id: order.id,
        customerId: order.customerId,
        status: order.status,
        items: JSON.stringify(order.items),
        totalAmount: order.totalAmount.toString(),
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      });

      // Add to sorted sets for querying
      await redis.zadd(this.getAllOrdersSetKey(), timestamp, order.id);
      await redis.zadd(this.getStatusSetKey(order.status), timestamp, order.id);
      await redis.zadd(this.getCustomerSetKey(order.customerId), timestamp, order.id);

      logger.info(`Saved order ${order.id} to read model`);
    } catch (error) {
      logger.error('Failed to save order to read model', error);
      throw error;
    }
  }

  async getOrderById(orderId: string): Promise<OrderReadModel | null> {
    try {
      const orderKey = this.getOrderKey(orderId);
      const orderData = await redis.hgetall(orderKey);

      if (!orderData || Object.keys(orderData).length === 0) {
        return null;
      }

      return {
        id: orderData.id,
        customerId: orderData.customerId,
        status: orderData.status as OrderStatus,
        items: JSON.parse(orderData.items),
        totalAmount: parseFloat(orderData.totalAmount),
        createdAt: orderData.createdAt,
        updatedAt: orderData.updatedAt,
      };
    } catch (error) {
      logger.error('Failed to get order from read model', error);
      throw error;
    }
  }

  async listOrders(options: {
    page?: number;
    limit?: number;
    status?: OrderStatus;
    customerId?: string;
  }): Promise<{
    orders: OrderReadModel[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 10;
      const offset = (page - 1) * limit;

      // Determine which sorted set to query
      let setKey: string;
      if (options.status) {
        setKey = this.getStatusSetKey(options.status);
      } else if (options.customerId) {
        setKey = this.getCustomerSetKey(options.customerId);
      } else {
        setKey = this.getAllOrdersSetKey();
      }

      // Get total count
      const total = await redis.zcard(setKey);

      // Get order IDs with pagination (reverse order - newest first)
      const orderIds = await redis.zrevrange(setKey, offset, offset + limit - 1);

      // Fetch order details
      const orders: OrderReadModel[] = [];
      for (const orderId of orderIds) {
        const order = await this.getOrderById(orderId);
        if (order) {
          orders.push(order);
        }
      }

      return {
        orders,
        total,
        page,
        limit,
      };
    } catch (error) {
      logger.error('Failed to list orders from read model', error);
      throw error;
    }
  }

  async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    updatedAt: string,
  ): Promise<void> {
    try {
      const order = await this.getOrderById(orderId);
      if (!order) {
        throw new Error(`Order ${orderId} not found in read model`);
      }

      const orderKey = this.getOrderKey(orderId);
      const oldStatus = order.status;

      // Update hash
      await redis.hset(orderKey, {
        status: newStatus,
        updatedAt,
      });

      // Move between sorted sets if status changed
      if (oldStatus !== newStatus) {
        const timestamp = Date.parse(order.createdAt);
        await redis.zrem(this.getStatusSetKey(oldStatus), orderId);
        await redis.zadd(this.getStatusSetKey(newStatus), timestamp, orderId);
      }

      logger.info(`Updated order ${orderId} status from ${oldStatus} to ${newStatus}`);
    } catch (error) {
      logger.error('Failed to update order status in read model', error);
      throw error;
    }
  }

  async deleteOrder(orderId: string): Promise<void> {
    try {
      const order = await this.getOrderById(orderId);
      if (!order) {
        return; // Already deleted or doesn't exist
      }

      const orderKey = this.getOrderKey(orderId);

      // Remove from hash
      await redis.del(orderKey);

      // Remove from sorted sets
      await redis.zrem(this.getAllOrdersSetKey(), orderId);
      await redis.zrem(this.getStatusSetKey(order.status), orderId);
      await redis.zrem(this.getCustomerSetKey(order.customerId), orderId);

      logger.info(`Deleted order ${orderId} from read model`);
    } catch (error) {
      logger.error('Failed to delete order from read model', error);
      throw error;
    }
  }
}

export const readModelRepository = new ReadModelRepository();
