import { Business, Supply } from '@prisma/client';
import { LOW_STOCK_THRESHOLD } from './constants';

export type InventoryItemResponse = {
  id: string;
  productId: string;
  productName: string;
  productUnit: string;
  businessId: string;
  businessName: string;
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

export type BusinessSummaryResponse = {
  id: string;
  name: string;
  type: string;
  location: string;
  verified: boolean;
};

export function toInventoryItemResponse(
  supply: Supply & {
    product: { name: string; unit: string };
    business: { name: string };
  },
): InventoryItemResponse {
  return {
    id: supply.id,
    productId: supply.productId,
    productName: supply.product.name,
    productUnit: supply.product.unit,
    businessId: supply.businessId,
    businessName: supply.business.name,
    sent: supply.sent,
    remaining: supply.remaining,
    sold: supply.sent - supply.remaining,
    unitPrice: supply.unitPrice,
    isLowStock: supply.remaining < LOW_STOCK_THRESHOLD,
    updatedAt: supply.updatedAt.toISOString(),
  };
}

export function toBusinessSummaryResponse(
  business: Business,
): BusinessSummaryResponse {
  return {
    id: business.id,
    name: business.name,
    type: business.type,
    location: business.location,
    verified: business.verified,
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
