import {
  Business,
  Order,
  OrderLine,
  OrderStatus,
  Product,
  User,
} from '@prisma/client';

export type OrderListItemResponse = {
  id: string;
  number: string;
  status: OrderStatus;
  total: number;
  pieces: number;
  createdAt: string;
  updatedAt: string;
  store: { id: string; name: string };
};

export type OrderLineResponse = {
  id: string;
  productId: string;
  productName: string;
  businessId: string;
  businessName: string;
  quantity: number;
  unitPrice: number;
  picked: boolean;
};

export type OrderDetailResponse = {
  order: {
    id: string;
    number: string;
    status: OrderStatus;
    total: number;
    pieces: number;
    createdAt: string;
    updatedAt: string;
    canCancel: boolean;
    canAdvance: boolean;
  };
  store: { id: string; name: string; phone: string };
  lines: OrderLineResponse[];
  delivery: null;
};

type OrderWithStore = Order & { store: User };

type OrderLineWithRelations = OrderLine & {
  product: Product;
  business: Business;
};

export function toOrderListItem(order: OrderWithStore): OrderListItemResponse {
  return {
    id: order.id,
    number: order.number,
    status: order.status,
    total: order.total,
    pieces: order.pieces,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    store: { id: order.store.id, name: order.store.name },
  };
}

export function toOrderLineResponse(
  line: OrderLineWithRelations,
): OrderLineResponse {
  return {
    id: line.id,
    productId: line.productId,
    productName: line.product.name,
    businessId: line.businessId,
    businessName: line.business.name,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    picked: line.picked,
  };
}

export function toOrderDetailResponse(
  order: OrderWithStore,
  lines: OrderLineWithRelations[],
  flags: { canCancel: boolean; canAdvance: boolean },
): OrderDetailResponse {
  return {
    order: {
      id: order.id,
      number: order.number,
      status: order.status,
      total: order.total,
      pieces: order.pieces,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      canCancel: flags.canCancel,
      canAdvance: flags.canAdvance,
    },
    store: {
      id: order.store.id,
      name: order.store.name,
      phone: order.store.phone,
    },
    lines: lines.map(toOrderLineResponse),
    delivery: null,
  };
}
