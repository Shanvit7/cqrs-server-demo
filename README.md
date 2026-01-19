# CQRS OMS Demo

A demo Order Management System (OMS) built with Bun, Hono, and Zod, demonstrating CQRS (Command Query Responsibility Segregation) patterns.

## Tech Stack

- **Bun**: Runtime and package manager
- **Hono**: Fast web framework
- **Zod**: Schema validation

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed on your system

### Installation

```bash
# Install dependencies
bun install
```

### Running the Server

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

- `POST /orders` - Create a new order
  - Body: `{ customerId: string, items: Array<{ productId: string, quantity: number, price: number }>, totalAmount: number }`

- `GET /orders/:id` - Get order by ID
  - Params: `id` (UUID)

- `PATCH /orders/:id` - Update order status
  - Params: `id` (UUID)
  - Body: `{ status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' }`

- `GET /orders` - List orders with pagination
  - Query params: `page` (optional), `limit` (optional), `status` (optional)

## Project Structure

```
cqrs-oms-demo/
├── src/
│   └── index.ts      # Main server file with routes
├── package.json
└── README.md
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

## Validation

All endpoints use Zod schemas for validation. Invalid requests will return appropriate error responses.

## License

MIT
