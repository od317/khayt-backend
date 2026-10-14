import { Supply } from '@prisma/client';
import { LOW_STOCK_THRESHOLD } from './constants';

export type InventoryItemResponse = {
  id: string;
  productId: string;
  productName: string;
  productUnit: string;
  /** Workshop that supplied this product into the platform warehouse. */
  supplierBusinessId: string | null;
  sent: number;
  remaining: number;
  sold: number;
  unitPrice: number;
  isLowStock: boolean;
  updatedAt: string;
};

export type InventoryMovementResponse = {
  id: string;
  type: string;
  quantity: number;
  reference: string | null;
  createdAt: string;
};

export function toInventoryItemResponse(
  supply: Supply & {
    product: {
      name: string;
      unit: string;
      supplierBusinessId?: string | null;
    };
  },
): InventoryItemResponse {
  return {
    id: supply.id,
    productId: supply.productId,
    productName: supply.product.name,
    productUnit: supply.product.unit,
    supplierBusinessId: supply.product.supplierBusinessId ?? null,
    sent: supply.sent,
    remaining: supply.remaining,
    sold: supply.sent - supply.remaining,
    unitPrice: supply.unitPrice,
    isLowStock: supply.remaining < LOW_STOCK_THRESHOLD,
    updatedAt: supply.updatedAt.toISOString(),
  };
}

export function toInventoryMovementResponse(movement: {
  id: string;
  type: string;
  quantity: number;
  reference: string | null;
  createdAt: Date;
}): InventoryMovementResponse {
  return {
    id: movement.id,
    type: movement.type,
    quantity: movement.quantity,
    reference: movement.reference,
    createdAt: movement.createdAt.toISOString(),
  };
}
