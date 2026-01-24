// TYPES
import type {
  OrderCreatedEventPayload,
  OrderStatusUpdatedEventPayload,
  OrderCancelledEventPayload,
} from '@/schemas/event.schema';
export interface DomainEvent {
  eventId: string;
  aggregateId: string;
  eventType: string;
  eventVersion: number;
  occurredAt: Date;
  payload: unknown;
  metadata?: {
    userId?: string;
    correlationId?: string;
    causationId?: string;
  };
}

export interface OrderCreatedEvent extends DomainEvent {
  eventType: 'OrderCreated';
  payload: OrderCreatedEventPayload;
}

export interface OrderStatusUpdatedEvent extends DomainEvent {
  eventType: 'OrderStatusUpdated';
  payload: OrderStatusUpdatedEventPayload;
}

export interface OrderCancelledEvent extends DomainEvent {
  eventType: 'OrderCancelled';
  payload: OrderCancelledEventPayload;
}

// Union type for all order events
export type OrderEvent = OrderCreatedEvent | OrderStatusUpdatedEvent | OrderCancelledEvent;

// Event type guard helpers
export const isOrderCreatedEvent = (event: DomainEvent): event is OrderCreatedEvent => {
  return event.eventType === 'OrderCreated';
};

export const isOrderStatusUpdatedEvent = (event: DomainEvent): event is OrderStatusUpdatedEvent => {
  return event.eventType === 'OrderStatusUpdated';
};

export const isOrderCancelledEvent = (event: DomainEvent): event is OrderCancelledEvent => {
  return event.eventType === 'OrderCancelled';
};
