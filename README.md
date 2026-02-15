# CQRS OMS Demo

A demo Order Management System (OMS) built with Bun, Hono, and Zod, demonstrating **CQRS (Command Query Responsibility Segregation)** and **Event Sourcing** patterns.

## Frontend Application

A Vue 3 frontend application that consumes this backend API is available at:

**[cqrs-web-demo](https://github.com/Shanvit7/cqrs-web-demo)** - A Vue 3 frontend application for the CQRS Order Management System (OMS) demo. This frontend demonstrates how to interact with a CQRS + Event Sourcing backend architecture.

The frontend provides:
- Product catalog and shopping cart
- Order creation and management
- Real-time CQRS event stream visualization
- Admin dashboard with event monitoring
- Order status tracking and updates

## Architecture

This project implements a full CQRS + Event Sourcing architecture:

- **Write Side (PostgreSQL)**: Event store - append-only log of all domain events
- **Read Side (Redis)**: Optimized read models - fast, in-memory queries
- **Event Bus**: Publishes events to projections that update read models
- **Domain Layer**: Order aggregate with business logic and event generation

### Why This Architecture?

- **Performance**: Redis provides 10-100x faster reads than PostgreSQL
- **Durability**: PostgreSQL ensures events are never lost
- **Scalability**: Read and write can scale independently
- **Flexibility**: Can add new read models without changing write model
- **Audit Trail**: Complete history in PostgreSQL event store
- **Real-World**: Matches production architecture patterns

## Tech Stack

- **Bun**: Runtime and package manager
- **Hono**: Fast web framework
- **Zod**: Schema validation
- **@hono/zod-validator**: Request validation middleware
- **@hono/swagger-ui**: API documentation
- **PostgreSQL**: Event store (write side)
- **Redis**: Read models (read side)

## Prerequisites

- [Bun](https://bun.sh/) installed on your system
- PostgreSQL running (default: localhost:5432)
- Redis running (default: localhost:6379)

## Installation

```bash
# Install dependencies
bun install
```

## Configuration

Create a `.env` file in the root directory:

```env
# PostgreSQL (Event Store)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=cqrs_oms
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# Redis (Read Model)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Application
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173  # Frontend URL for CORS
```

## Database Setup

### PostgreSQL

Create the database:

```bash
createdb cqrs_oms
```

Run migrations manually:

```bash
# Run pending migrations
bun run migrate:up

# Rollback last migration
bun run migrate:down

# Check migration status
bun run migrate:status
```

Migrations also run automatically on server start.

### Redis

Make sure Redis is running:

```bash
redis-server
```

## Running the Server

```bash
# Development mode
bun run dev

# Or start directly
bun run start
```

The server will start on `http://localhost:3000` (or the port specified in the `PORT` environment variable).

## API Documentation

Interactive API documentation is available at:
- **Swagger UI**: `http://localhost:3000/docs`

## API Endpoints

### Health Check
- `GET /` - Returns API status

### Documentation
- `GET /docs` - Interactive Swagger UI documentation
- `GET /openapi.json` - OpenAPI specification (JSON)

### Orders

- `POST /orders` - Create a new order (dispatches CreateOrderCommand)
  - Body: `{ customerId: string, items: Array<{ productId: string, quantity: number, price: number }>, totalAmount: number }`
  - Returns: `{ message: string, orderId: string }`

- `GET /orders/:id` - Get order by ID (executes GetOrderQuery)
  - Params: `id` (UUID)
  - Returns: `{ message: string, order: OrderReadModel }`

- `PATCH /orders/:id` - Update order status (dispatches UpdateOrderStatusCommand)
  - Params: `id` (UUID)
  - Body: `{ status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' }`
  - Returns: `{ message: string, orderId: string, status: string }`

- `GET /orders` - List orders with pagination (executes ListOrdersQuery)
  - Query params: `page` (optional, default: 1), `limit` (optional, default: 10), `status` (optional), `customerId` (optional)
  - Returns: `{ message: string, pagination: { page, limit, total }, orders: OrderReadModel[] }`

### Event Store

- `GET /events` - List events from event store (for interactive CQRS demo)
  - Query params: 
    - `page` (optional, default: 1) - Page number
    - `limit` (optional, default: 50, max: 500) - Max events per page
    - `eventType` (optional) - Filter by event type (e.g., "OrderCreated")
    - `aggregateId` (optional, UUID) - Filter by order ID
    - `fromDate` (optional, ISO datetime) - Filter events from this date
    - `toDate` (optional, ISO datetime) - Filter events until this date
  - Returns: `{ message: string, pagination: { page, limit, total }, events: Event[] }`
  - Event response includes:
    - `eventId`, `aggregateId`, `orderId` (alias), `eventType`, `eventVersion`
    - `occurredAt` (ISO timestamp)
    - `customerId` (extracted from payload if available)
    - `payload` (event-specific data)
    - `metadata` (includes orderId, eventType, occurredAt, customerId)

## Project Structure

```
src/
├── index.ts                           # Main server with CQRS routes and Swagger UI
├── schemas/
│   ├── order.schema.ts                # Order Zod schemas (commands, queries, validation)
│   └── event.schema.ts                # Event payload schemas
├── domain/
│   ├── order.ts                       # Order aggregate root with business logic
│   └── events.ts                      # Domain event definitions and type guards
├── commands/
│   ├── create-order.ts                # CreateOrderCommand handler
│   └── update-order-status.ts         # UpdateOrderStatusCommand handler
├── queries/
│   ├── get-order.ts                   # GetOrderQuery handler
│   └── list-orders.ts                 # ListOrdersQuery handler
├── infrastructure/
│   ├── event-bus.ts                  # Event dispatcher (pub/sub)
│   ├── database/
│   │   ├── postgres.ts               # PostgreSQL connection pool
│   │   ├── redis.ts                  # Redis client
│   │   ├── migrations.ts              # Migration runner (auto-runs on startup)
│   │   ├── migrate.ts                # Migration CLI script
│   │   ├── migration-runner.ts       # Custom migration system with rollback
│   │   ├── migrations/                # SQL migration files
│   │   │   ├── README.md
│   │   │   └── {timestamp}_{name}/
│   │   │       ├── up.sql            # Migration SQL
│   │   │       └── down.sql          # Rollback SQL
│   │   └── repositories/
│   │       ├── event-store.repository.ts    # PostgreSQL event store operations
│   │       └── read-model.repository.ts     # Redis read model operations
│   ├── projections/
│   │   └── order-projection.ts        # Builds Redis read models from events
│   └── utils/
│       └── event-replay.ts            # Event replay service
└── utils/
    ├── constants.ts                   # Configuration constants
    ├── logger.ts                      # Logging utility
    └── replay.ts                      # Event replay CLI script
```

## Example Requests

### Create Order

```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-123",
    "items": [
      {
        "productId": "product-1",
        "quantity": 2,
        "price": 29.99
      }
    ],
    "totalAmount": 59.98
  }'
```

### Get Order

```bash
curl http://localhost:3000/orders/{order-id}
```

### Update Order Status

```bash
curl -X PATCH http://localhost:3000/orders/{order-id} \
  -H "Content-Type: application/json" \
  -d '{"status": "processing"}'
```

### List Orders

```bash
# List all orders
curl http://localhost:3000/orders

# List orders by status
curl "http://localhost:3000/orders?status=pending&page=1&limit=10"

# List orders by customer
curl "http://localhost:3000/orders?customerId=customer-123"
```

### List Events

```bash
# List all events
curl "http://localhost:3000/events"

# List events with pagination
curl "http://localhost:3000/events?page=1&limit=50"

# Filter by event type
curl "http://localhost:3000/events?eventType=OrderCreated"

# Filter by order ID
curl "http://localhost:3000/events?aggregateId={order-uuid}"

# Filter by date range
curl "http://localhost:3000/events?fromDate=2024-01-01T00:00:00Z&toDate=2024-01-31T23:59:59Z"

# Combined filters
curl "http://localhost:3000/events?eventType=OrderStatusUpdated&aggregateId={order-uuid}&page=1&limit=20"
```

## Database Migrations

Migrations run automatically on server start. You can also run them manually:

```bash
# Run pending migrations
bun run migrate:up

# Rollback last migration
bun run migrate:down

# Rollback last N migrations
bun run migrate:down 2

# Check migration status
bun run migrate:status
```

Migrations are stored in `src/infrastructure/database/migrations/` with format `{timestamp}_{description}/` containing `up.sql` and `down.sql` files.

## Event Replay

To rebuild read models from events (useful after failures or for testing):

```bash
# Replay all events
bun run replay

# Replay events for a specific aggregate
bun run replay {aggregate-id}
```

## How It Works

### Write Flow (Command)
1. API receives request → Creates command
2. Command handler loads/creates aggregate
3. Aggregate executes business logic → Generates domain events
4. Events saved to PostgreSQL event store
5. Events published to event bus
6. Projections listen to events → Update Redis read models

### Read Flow (Query)
1. API receives request → Creates query
2. Query handler reads from Redis read model
3. Returns optimized data to client

## Key Features

- **Event Sourcing**: All state changes stored as events in PostgreSQL
- **Read Model Projections**: Redis updated asynchronously from events
- **Fast Queries**: Redis provides sub-millisecond read performance
- **Event Replay**: Can rebuild Redis from PostgreSQL events
- **Separation**: Write and read databases completely independent
- **Scalability**: Can scale Redis separately for read traffic
- **Optimistic Concurrency**: Prevents race conditions using event versioning

## Development

### Code Quality

```bash
# Lint code
bun run lint

# Fix linting issues
bun run lint:fix

# Format code
bun run format

# Type check
bun run type-check
```

### Project Features

- **ES6 Arrow Functions**: All functions use modern arrow function syntax
- **Organized Imports**: Imports grouped by category with comments
- **Custom Migrations**: SQL-based migration system with rollback support
- **Swagger Documentation**: Interactive API docs at `/docs`
- **Type Safety**: Full TypeScript with Zod validation

## Validation

All endpoints use Zod schemas for validation. Invalid requests will return appropriate error responses.

## License

MIT
