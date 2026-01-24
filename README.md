# CQRS OMS Demo

A demo Order Management System (OMS) built with Bun, Hono, and Zod, demonstrating **CQRS (Command Query Responsibility Segregation)** and **Event Sourcing** patterns.

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
```

## Database Setup

### PostgreSQL

Create the database:

```bash
createdb cqrs_oms
```

The migrations will run automatically on server start.

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

## API Endpoints

### Health Check
- `GET /` - Returns API status

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

## Project Structure

```
src/
├── index.ts                    # Main server with CQRS routes
├── schemas/
│   └── order.schema.ts        # Zod schemas
├── utils/
│   ├── constants.ts           # Configuration
│   └── logger.ts              # Logging utility
├── domain/
│   ├── order.ts               # Order aggregate root
│   └── events.ts              # Domain event definitions
├── commands/
│   ├── create-order.command.ts
│   ├── update-order-status.command.ts
│   └── handlers/
│       ├── create-order.handler.ts
│       └── update-order-status.handler.ts
├── queries/
│   ├── get-order.query.ts
│   ├── list-orders.query.ts
│   └── handlers/
│       ├── get-order.handler.ts
│       └── list-orders.handler.ts
├── infrastructure/
│   ├── event-store.ts         # PostgreSQL event store
│   ├── event-bus.ts          # Event dispatcher
│   ├── database/
│   │   ├── postgres.ts        # PostgreSQL connection
│   │   ├── redis.ts           # Redis connection
│   │   ├── migrations.ts      # Database migrations
│   │   └── repositories/
│   │       ├── event-store.repository.ts  # PostgreSQL
│   │       └── read-model.repository.ts  # Redis
│   ├── projections/
│   │   └── order-projection.ts  # Builds Redis read models from events
│   └── utils/
│       └── event-replay.ts    # Event replay utility
└── utils/
    └── replay.ts              # Replay script
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

## Event Replay

To rebuild read models from events (useful after failures or for testing):

```bash
# Replay all events
bun run src/utils/replay.ts

# Replay events for a specific aggregate
bun run src/utils/replay.ts {aggregate-id}
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

## Validation

All endpoints use Zod schemas for validation. Invalid requests will return appropriate error responses.

## License

MIT
