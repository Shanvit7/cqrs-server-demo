// VALIDATION
import { z } from 'zod';

// Order status enum
export const orderStatusEnum = z.enum([
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
]);

export type OrderStatus = z.infer<typeof orderStatusEnum>;

// Order item schema
export const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  price: z.number().positive(),
});

// Create order schema
export const createOrderSchema = z.object({
  customerId: z.string().min(1),
  items: z.array(orderItemSchema).min(1),
  totalAmount: z.number().positive(),
});

// Update order schema
export const updateOrderSchema = z.object({
  status: orderStatusEnum,
});

// Order ID parameter schema
export const orderIdSchema = z.object({
  id: z.string().uuid(),
});

// List orders query schema (for API - transforms strings to numbers)
export const listOrdersSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10)),
  status: orderStatusEnum.optional(),
  customerId: z.string().optional(),
});

// Command schemas
export const createOrderCommandSchema = z.object({
  customerId: z.string().min(1),
  items: z.array(orderItemSchema).min(1),
  totalAmount: z.number().positive(),
});

export const updateOrderStatusCommandSchema = z.object({
  orderId: z.string().uuid(),
  status: orderStatusEnum,
});

// Query schemas
export const getOrderQuerySchema = z.object({
  orderId: z.string().uuid(),
});

export const listOrdersQuerySchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(10),
  status: orderStatusEnum.optional(),
  customerId: z.string().optional(),
});

// Type exports
export type CreateOrderCommand = z.infer<typeof createOrderCommandSchema>;
export type UpdateOrderStatusCommand = z.infer<typeof updateOrderStatusCommandSchema>;
export type GetOrderQuery = z.infer<typeof getOrderQuerySchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
