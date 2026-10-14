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
import { orderStatusColor } from '../../common/order-status-labels';

export type OrderListItemResponse = {
  id: string;
  number: string;
  status: OrderStatus;
  statusColor: string;
  total: number;
  pieces: number;
  address: string;
  lat: number | null;
  lng: number | null;
  createdAt: string;
  updatedAt: string;
  store: { id: string; name: string | null };
};

export type OrderLineResponse = {
  id: string;
  productId: string;
  productName: string;
  productImage: string | null;
  quantity: number;
  unitPrice: number;
  picked: boolean;
  variant: Record<string, string> | null;
};

export type OrderDeliveryResponse = {
  id: string;
  number: string;
  status: string;
  driver: { id: string; name: string | null; phone: string | null } | null;
};

export type OrderDetailResponse = {
  order: {
    id: string;
    number: string;
    status: OrderStatus;
    statusColor: string;
    total: number;
    pieces: number;
    address: string;
    lat: number | null;
    lng: number | null;
    createdAt: string;
    updatedAt: string;
    canCancel: boolean;
    canAdvance: boolean;
  };
  store: { id: string; name: string | null; phone: string | null };
  lines: OrderLineResponse[];
  delivery: OrderDeliveryResponse | null;
  whatsapp: string;
  phone: string;
};

type OrderWithStore = Order & {
  store: User;
  lines?: { quantity: number }[];
};

export function orderPieces(
  order: Pick<Order, 'pieces'> & { lines?: { quantity: number }[] },
): number {
  if (order.lines && order.lines.length > 0) {
    return order.lines.reduce((sum, line) => sum + line.quantity, 0);
  }
  return order.pieces;
}

type OrderLineWithRelations = {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  picked: boolean;
  variant?: unknown;
  product: { name: string; images: string[] };
};

export function toOrderListItem(order: OrderWithStore): OrderListItemResponse {
  return {
    id: order.id,
    number: order.number,
    status: order.status,
    statusColor: orderStatusColor(order.status),
    total: order.total,
    pieces: orderPieces(order),
    address: order.address,
    lat: order.lat,
    lng: order.lng,
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
    productImage: line.product.images?.[0] ?? null,
    variant:
      line.variant && typeof line.variant === 'object' && !Array.isArray(line.variant)
        ? (line.variant as Record<string, string>)
        : null,
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
  contacts: { whatsapp: string; phone: string } = { whatsapp: '', phone: '' },
): OrderDetailResponse {
  return {
    order: {
      id: order.id,
      number: order.number,
      status: order.status,
      statusColor: orderStatusColor(order.status),
      total: order.total,
      pieces: orderPieces({
        pieces: order.pieces,
        lines: lines.map((line) => ({ quantity: line.quantity })),
      }),
      address: order.address,
      lat: order.lat,
      lng: order.lng,
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
    whatsapp: contacts.whatsapp,
    phone: contacts.phone,
  };
}