import { z } from 'zod';

// Order status enum
export const orderStatusEnum = z.enum([
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
]);

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

// List orders query schema
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
});
