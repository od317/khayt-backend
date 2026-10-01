import { OrderStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { ORDER_STATUS_COLORS, orderStatusColor } from './order-status-labels';

describe('orderStatusColor', () => {
  it('returns a hex color for every order status', () => {
    for (const status of Object.values(OrderStatus)) {
      expect(ORDER_STATUS_COLORS[status]).toMatch(/^#[0-9A-F]{6}$/i);
      expect(orderStatusColor(status)).toBe(ORDER_STATUS_COLORS[status]);
    }
  });
});
