import {
  Business,
  BusinessType,
  Location,
  MediaType,
  Order,
  OrderStatus,
  PostType,
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

export type OrderDeliveryResponse = {
  id: string;
  number: string;
  status: string;
  driver: { id: string; name: string; phone: string | null } | null;
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
  store: { id: string; name: string; phone: string | null };
  lines: OrderLineResponse[];
  delivery: OrderDeliveryResponse | null;
};

type OrderWithStore = Order & { store: User };

type OrderLineWithRelations = {
  id: string;
  orderId: string;
  productId: string;
  businessId: string;
  quantity: number;
  unitPrice: number;
  picked: boolean;
  product: { name: string };
  business: { name: string };
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
  delivery: OrderDeliveryResponse | null = null,
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
    delivery,
  };
}
