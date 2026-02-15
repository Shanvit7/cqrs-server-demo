import { randomUUID } from 'crypto';
// DOMAIN
import {
  DomainEvent,
  OrderCreatedEvent,
  OrderStatusUpdatedEvent,
  OrderCancelledEvent,
  OrderEvent,
} from '@/domain/events';
// TYPES
import type { OrderStatus } from '@/schemas/order.schema';
// SCHEMAS
import {
  orderCreatedEventSchema,
  orderStatusUpdatedEventSchema,
  orderCancelledEventSchema,
} from '@/schemas/event.schema';

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

export class Order {
  private id: string;
  private customerId: string;
  private status: OrderStatus;
  private items: OrderItem[];
  private totalAmount: number;
  private version: number;
  private uncommittedEvents: DomainEvent[] = [];

  private constructor(
    id: string,
    customerId: string,
    status: OrderStatus,
    items: OrderItem[],
    totalAmount: number,
    version: number,
  ) {
    this.id = id;
    this.customerId = customerId;
    this.status = status;
    this.items = items;
    this.totalAmount = totalAmount;
    this.version = version;
  }

  // Factory method to create a new order
  static create(customerId: string, items: OrderItem[], totalAmount: number): Order {
    const orderId = randomUUID();
    const order = new Order(orderId, customerId, 'pending', items, totalAmount, 0);

    const occurredAt = new Date();
    const event: OrderCreatedEvent = {
      eventId: randomUUID(),
      aggregateId: orderId,
      eventType: 'OrderCreated',
      eventVersion: 1,
      occurredAt,
      payload: orderCreatedEventSchema.parse({
        customerId,
        items,
        totalAmount,
      }),
      metadata: {
        orderId, // Link event to order
        eventType: 'OrderCreated', // Event type in metadata
        occurredAt: occurredAt.toISOString(), // Timestamp in metadata for sorting
      },
    };

    order.uncommittedEvents.push(event);
    return order;
  }

  // Reconstruct order from events
  static fromEvents(events: OrderEvent[]): Order {
    if (events.length === 0) {
      throw new Error('Cannot reconstruct order from empty events');
    }

    const firstEvent = events[0];
    if (firstEvent.eventType !== 'OrderCreated') {
      throw new Error('First event must be OrderCreated');
    }

    const order = new Order(
      firstEvent.aggregateId,
      firstEvent.payload.customerId,
      'pending',
      firstEvent.payload.items,
      firstEvent.payload.totalAmount,
      0,
    );

    // Apply remaining events
    for (const event of events.slice(1)) {
      order.applyEvent(event);
    }

    // Set version to the last event's version
    const lastEvent = events[events.length - 1];
    order.version = lastEvent.eventVersion;
    return order;
  }

  // Apply event to aggregate (for event sourcing)
  private applyEvent(event: OrderEvent): Order {
    if (event.eventType === 'OrderStatusUpdated') {
      this.status = event.payload.status;
    } else if (event.eventType === 'OrderCancelled') {
      this.status = 'cancelled';
    }
    return this;
  }

  // Business logic: Update order status
  updateStatus(newStatus: OrderStatus): void {
    if (this.status === 'cancelled') {
      throw new Error('Cannot update status of cancelled order');
    }

    if (this.status === newStatus) {
      return; // No change needed
    }

    const previousStatus = this.status;
    this.status = newStatus;

    const occurredAt = new Date();
    const event: OrderStatusUpdatedEvent = {
      eventId: randomUUID(),
      aggregateId: this.id,
      eventType: 'OrderStatusUpdated',
      eventVersion: this.version + 1,
      occurredAt,
      payload: orderStatusUpdatedEventSchema.parse({
        status: newStatus,
        previousStatus,
      }),
      metadata: {
        orderId: this.id, // Link event to order
        eventType: 'OrderStatusUpdated', // Event type in metadata
        occurredAt: occurredAt.toISOString(), // Timestamp in metadata for sorting
      },
    };

    this.uncommittedEvents.push(event);
  }

  // Business logic: Cancel order
  cancel(reason?: string): void {
    if (this.status === 'cancelled') {
      return; // Already cancelled
    }

    if (this.status === 'delivered') {
      throw new Error('Cannot cancel delivered order');
    }

    this.status = 'cancelled';

    const occurredAt = new Date();
    const event: OrderCancelledEvent = {
      eventId: randomUUID(),
      aggregateId: this.id,
      eventType: 'OrderCancelled',
      eventVersion: this.version + 1,
      occurredAt,
      payload: orderCancelledEventSchema.parse({ reason }),
      metadata: {
        orderId: this.id, // Link event to order
        eventType: 'OrderCancelled', // Event type in metadata
        occurredAt: occurredAt.toISOString(), // Timestamp in metadata for sorting
      },
    };

    this.uncommittedEvents.push(event);
  }

  // Getters
  getId(): string {
    return this.id;
  }

  getCustomerId(): string {
    return this.customerId;
  }

  getStatus(): OrderStatus {
    return this.status;
  }

  getItems(): OrderItem[] {
    return [...this.items];
  }

  getTotalAmount(): number {
    return this.totalAmount;
  }

  getVersion(): number {
    return this.version;
  }

  getUncommittedEvents(): DomainEvent[] {
    return [...this.uncommittedEvents];
  }

  markEventsAsCommitted(): void {
    const eventCount = this.uncommittedEvents.length;
    this.uncommittedEvents = [];
    this.version += eventCount;
  }

  // Snapshot for read model
  toSnapshot() {
    return {
      id: this.id,
      customerId: this.customerId,
      status: this.status,
      items: this.items,
      totalAmount: this.totalAmount,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
