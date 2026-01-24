// VALIDATION
import { z } from 'zod';

// SCHEMAS
import { orderStatusEnum, orderItemSchema } from './order.schema';

// Order Created Event Schema
export const orderCreatedEventSchema = z.object({
  customerId: z.string().min(1),
  items: z.array(orderItemSchema),
  totalAmount: z.number().positive(),
});

export type OrderCreatedEventPayload = z.infer<typeof orderCreatedEventSchema>;

// Order Status Updated Event Schema
export const orderStatusUpdatedEventSchema = z.object({
  status: orderStatusEnum,
  previousStatus: orderStatusEnum.optional(),
});

export type OrderStatusUpdatedEventPayload = z.infer<typeof orderStatusUpdatedEventSchema>;

// Order Cancelled Event Schema
export const orderCancelledEventSchema = z.object({
  reason: z.string().optional(),
});

export type OrderCancelledEventPayload = z.infer<typeof orderCancelledEventSchema>;
