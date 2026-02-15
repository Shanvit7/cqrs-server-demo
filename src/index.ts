// CORE
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { zValidator } from '@hono/zod-validator';
import { swaggerUI } from '@hono/swagger-ui';
// UTILS
import { PORT as port, CORS_ORIGIN } from '@/utils/constants';
import logger from '@/utils/logger';
// SCHEMAS
import {
  createOrderSchema,
  updateOrderSchema,
  orderIdSchema,
  listOrdersSchema,
  listEventsSchema,
  createOrderCommandSchema,
  updateOrderStatusCommandSchema,
  getOrderQuerySchema,
  listOrdersQuerySchema,
} from '@/schemas/order.schema';
// INFRASTRUCTURE
import { runMigrations } from '@/infrastructure/database/migrations';
import { orderProjection } from '@/infrastructure/projections/order-projection';
import { eventStoreRepository } from '@/infrastructure/database/repositories/event-store.repository';
// COMMANDS
import { createOrderHandler } from '@/commands/create-order';
import { updateOrderStatusHandler } from '@/commands/update-order-status';
// QUERIES
import { getOrderHandler } from '@/queries/get-order';
import { listOrdersHandler } from '@/queries/list-orders';

const app = new Hono();

// CORS – allow frontend origin from env
app.use(
  '*',
  cors({
    origin: CORS_ORIGIN,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
);

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

// OpenAPI JSON spec (required by Swagger UI)
app.get('/openapi.json', (c) => {
  return c.json({
    openapi: '3.0.0',
    info: {
      title: 'CQRS OMS Demo API',
      version: '1.0.0',
      description: 'A demo Order Management System built with CQRS and Event Sourcing patterns',
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: 'Local development server',
      },
    ],
    paths: {
      '/': {
        get: {
          summary: 'Health check',
          tags: ['Health'],
          responses: {
            '200': {
              description: 'API is healthy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      status: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/orders': {
        post: {
          summary: 'Create a new order',
          tags: ['Orders'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['customerId', 'items', 'totalAmount'],
                  properties: {
                    customerId: { type: 'string', example: 'customer-123' },
                    items: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          productId: { type: 'string', example: 'product-123' },
                          quantity: { type: 'number', example: 2 },
                          price: { type: 'number', example: 29.99 },
                        },
                      },
                    },
                    totalAmount: { type: 'number', example: 59.98 },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Order created successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      orderId: { type: 'string', format: 'uuid' },
                    },
                  },
                },
              },
            },
            '400': { description: 'Bad request' },
            '500': { description: 'Internal server error' },
          },
        },
        get: {
          summary: 'List orders',
          tags: ['Orders'],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'string' } },
            { name: 'limit', in: 'query', schema: { type: 'string' } },
            {
              name: 'status',
              in: 'query',
              schema: {
                type: 'string',
                enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
              },
            },
            { name: 'customerId', in: 'query', schema: { type: 'string' } },
          ],
          responses: {
            '200': {
              description: 'Orders retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      pagination: {
                        type: 'object',
                        properties: {
                          page: { type: 'number' },
                          limit: { type: 'number' },
                          total: { type: 'number' },
                        },
                      },
                      orders: { type: 'array', items: { type: 'object' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/orders/{id}': {
        get: {
          summary: 'Get order by ID',
          tags: ['Orders'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            '200': {
              description: 'Order retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      order: { type: 'object' },
                    },
                  },
                },
              },
            },
            '404': { description: 'Order not found' },
          },
        },
        patch: {
          summary: 'Update order status',
          tags: ['Orders'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['status'],
                  properties: {
                    status: {
                      type: 'string',
                      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
                      example: 'processing',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Order updated successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      orderId: { type: 'string', format: 'uuid' },
                      status: { type: 'string' },
                    },
                  },
                },
              },
            },
            '404': { description: 'Order not found' },
          },
        },
      },
      '/events': {
        get: {
          summary: 'List events from event store',
          description: 'Returns events from the event store for the interactive CQRS demo.',
          tags: ['Event Store'],
          parameters: [
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', default: 1 },
              description: 'Page number (1-based)',
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 50 },
              description: 'Max events to return',
            },
            {
              name: 'eventType',
              in: 'query',
              schema: { type: 'string' },
              description: 'Filter by event type (e.g., OrderCreated)',
            },
            {
              name: 'aggregateId',
              in: 'query',
              schema: { type: 'string', format: 'uuid' },
              description: 'Filter by aggregate ID',
            },
            {
              name: 'fromDate',
              in: 'query',
              schema: { type: 'string', format: 'date-time' },
              description: 'Filter events from this date',
            },
            {
              name: 'toDate',
              in: 'query',
              schema: { type: 'string', format: 'date-time' },
              description: 'Filter events until this date',
            },
          ],
          responses: {
            '200': {
              description: 'Events retrieved',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      pagination: {
                        type: 'object',
                        properties: {
                          page: { type: 'integer' },
                          limit: { type: 'integer' },
                          total: { type: 'integer' },
                        },
                      },
                      events: {
                        type: 'array',
                        items: { type: 'object' },
                      },
                    },
                  },
                },
              },
            },
            '400': { description: 'Bad request' },
            '500': { description: 'Internal server error' },
          },
        },
      },
    },
  });
});

// Swagger UI Documentation
app.get('/docs', swaggerUI({ url: '/openapi.json' }));

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

// List events from event store (for interactive CQRS demo)
app.get('/events', zValidator('query', listEventsSchema), async (c) => {
  try {
    const queryParams = c.req.valid('query');
    const page = queryParams.page || 1;
    const limit = queryParams.limit || 50;
    const offset = (page - 1) * limit;

    const fromDate = queryParams.fromDate ? new Date(queryParams.fromDate) : undefined;
    const toDate = queryParams.toDate ? new Date(queryParams.toDate) : undefined;

    const { events, total } = await eventStoreRepository.getAllEvents({
      limit,
      offset,
      eventType: queryParams.eventType,
      aggregateId: queryParams.aggregateId,
      fromDate,
      toDate,
    });

    return c.json({
      message: 'Events retrieved',
      pagination: {
        page,
        limit,
        total,
      },
      events: events.map((e) => {
        const occurredAtISO =
          e.occurredAt instanceof Date ? e.occurredAt.toISOString() : e.occurredAt;

        // Extract customerId from payload if it exists (for OrderCreated events)
        const payload = e.payload as Record<string, unknown>;
        const customerId = 'customerId' in payload ? (payload.customerId as string) : undefined;

        return {
          eventId: e.eventId,
          aggregateId: e.aggregateId,
          orderId: e.aggregateId, // Alias for easier access
          eventType: e.eventType,
          eventVersion: e.eventVersion,
          occurredAt: occurredAtISO,
          customerId, // Include customerId if available in payload
          payload: e.payload,
          metadata: e.metadata || {
            orderId: e.aggregateId,
            eventType: e.eventType,
            occurredAt: occurredAtISO,
            ...(customerId && { customerId }), // Include customerId in metadata if available
          },
        };
      }),
    });
  } catch (error) {
    logger.error('Failed to list events', error);
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
    logger.info(`📚 API Documentation: http://localhost:${port}/docs`);
  })
  .catch((error) => {
    logger.error('Failed to start server', error);
    process.exit(1);
  });

export default {
  port,
  fetch: app.fetch,
};
