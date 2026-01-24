// CORE
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
// UTILS
import { PORT as port } from '@/utils/constants';
import logger from '@/utils/logger';
// SCHEMAS
import {
  createOrderSchema,
  updateOrderSchema,
  orderIdSchema,
  listOrdersSchema,
  createOrderCommandSchema,
  updateOrderStatusCommandSchema,
  getOrderQuerySchema,
  listOrdersQuerySchema,
} from '@/schemas/order.schema';
// INFRASTRUCTURE
import { runMigrations } from '@/infrastructure/database/migrations';
import { orderProjection } from '@/infrastructure/projections/order-projection';
// COMMANDS
import { createOrderHandler } from '@/commands/create-order';
import { updateOrderStatusHandler } from '@/commands/update-order-status';
// QUERIES
import { getOrderHandler } from '@/queries/get-order';
import { listOrdersHandler } from '@/queries/list-orders';

const app = new Hono();

// Initialize CQRS infrastructure
const initialize = async () => {
  try {
    // Run database migrations
    await runMigrations();
    logger.info('Database migrations completed');

    // Initialize projections
    orderProjection.initialize();
    logger.info('Projections initialized');

    logger.info('CQRS infrastructure initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize CQRS infrastructure', error);
    throw error;
  }
};

// Health check route
app.get('/', (c) => {
  return c.json({ message: 'CQRS OMS Demo API', status: 'healthy' });
});

// Create order endpoint - dispatches CreateOrderCommand
app.post('/orders', zValidator('json', createOrderSchema), async (c) => {
  try {
    const data = c.req.valid('json');
    const command = createOrderCommandSchema.parse(data);

    const result = await createOrderHandler.handle(command);

    return c.json(
      {
        message: 'Order created',
        orderId: result.orderId,
      },
      201,
    );
  } catch (error) {
    logger.error('Failed to create order', error);
    if (error instanceof Error) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get order by ID - executes GetOrderQuery
app.get('/orders/:id', zValidator('param', orderIdSchema), async (c) => {
  try {
    const { id } = c.req.valid('param');
    const query = getOrderQuerySchema.parse({ orderId: id });

    const order = await getOrderHandler.handle(query);

    return c.json({
      message: 'Order retrieved',
      order,
    });
  } catch (error) {
    logger.error('Failed to get order', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return c.json({ error: error.message }, 404);
    }
    if (error instanceof Error) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Update order status - dispatches UpdateOrderStatusCommand
app.patch(
  '/orders/:id',
  zValidator('param', orderIdSchema),
  zValidator('json', updateOrderSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      const { status } = c.req.valid('json');
      const command = updateOrderStatusCommandSchema.parse({
        orderId: id,
        status,
      });

      const result = await updateOrderStatusHandler.handle(command);

      return c.json({
        message: 'Order updated',
        orderId: result.orderId,
        status: result.status,
      });
    } catch (error) {
      logger.error('Failed to update order status', error);
      if (error instanceof Error && error.message.includes('not found')) {
        return c.json({ error: error.message }, 404);
      }
      if (error instanceof Error) {
        return c.json({ error: error.message }, 400);
      }
      return c.json({ error: 'Internal server error' }, 500);
    }
  },
);

// List orders - executes ListOrdersQuery
app.get('/orders', zValidator('query', listOrdersSchema), async (c) => {
  try {
    const queryParams = c.req.valid('query');
    const query = listOrdersQuerySchema.parse({
      page: queryParams.page,
      limit: queryParams.limit,
      status: queryParams.status,
      customerId: queryParams.customerId,
    });

    const result = await listOrdersHandler.handle(query);

    return c.json({
      message: 'Orders retrieved',
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
      orders: result.orders,
    });
  } catch (error) {
    logger.error('Failed to list orders', error);
    if (error instanceof Error) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Initialize and start server
initialize()
  .then(() => {
    logger.info(`🚀 Server running on http://localhost:${port}`);
  })
  .catch((error) => {
    logger.error('Failed to start server', error);
    process.exit(1);
  });

export default {
  port,
  fetch: app.fetch,
};
