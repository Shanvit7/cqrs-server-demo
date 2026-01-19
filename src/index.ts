import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { PORT as port } from '@/utils/constants';
import {
  createOrderSchema,
  updateOrderSchema,
  orderIdSchema,
  listOrdersSchema,
} from '@/schemas/order.schema';
import logger from '@/utils/logger';

const app = new Hono();

// Health check route
app.get('/', (c) => {
  return c.json({ message: 'CQRS OMS Demo API', status: 'healthy' });
});

// Create order endpoint with validation
app.post('/orders', zValidator('json', createOrderSchema), async (c) => {
  const data = c.req.valid('json');

  // In a real CQRS system, this would dispatch a command
  return c.json(
    {
      message: 'Order created',
      order: {
        id: crypto.randomUUID(),
        ...data,
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    },
    201,
  );
});

// Get order by ID with validation
app.get('/orders/:id', zValidator('param', orderIdSchema), async (c) => {
  const { id } = c.req.valid('param');

  // In a real CQRS system, this would query the read model
  return c.json({
    message: 'Order retrieved',
    order: {
      id,
      customerId: 'customer-123',
      status: 'pending',
      items: [],
      totalAmount: 0,
      createdAt: new Date().toISOString(),
    },
  });
});

// Update order status with validation
app.patch(
  '/orders/:id',
  zValidator('param', orderIdSchema),
  zValidator('json', updateOrderSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const { status } = c.req.valid('json');

    // In a real CQRS system, this would dispatch a command
    return c.json({
      message: 'Order updated',
      order: {
        id,
        status,
        updatedAt: new Date().toISOString(),
      },
    });
  },
);

// List orders (with optional query params)
app.get('/orders', zValidator('query', listOrdersSchema), async (c) => {
  const { page, limit, status } = c.req.valid('query');

  // In a real CQRS system, this would query the read model
  return c.json({
    message: 'Orders retrieved',
    pagination: {
      page,
      limit,
      total: 0,
    },
    filters: {
      status,
    },
    orders: [],
  });
});

logger.info(`🚀 Server running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
