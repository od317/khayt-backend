import { Delivery, DeliveryStatus, User } from '@prisma/client';

export type DriverResponse = {
  id: string;
  name: string;
  phone: string | null;
};

export type DeliveryResponse = {
  id: string;
  number: string;
  status: DeliveryStatus;
  area: string;
  driverId: string | null;
  driverName: string | null;
  orderCount: number;
  createdAt: string;
  deliveredAt: string | null;
};

export type OrderSummary = {
  id: string;
  number: string;
  status: string;
  storeName: string;
  pieces: number;
  total: number;
};

export function toDriverResponse(user: User): DriverResponse {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
  };
}

export function toDeliveryResponse(
  delivery: Delivery & {
    driver: User | null;
    _count: { orders: number };
  },
): DeliveryResponse {
  return {
    id: delivery.id,
    number: delivery.number,
    status: delivery.status,
    area: delivery.area,
    driverId: delivery.driverId,
    driverName: delivery.driver ? delivery.driver.name : null,
    orderCount: delivery._count.orders,
    createdAt: delivery.createdAt.toISOString(),
    deliveredAt: delivery.deliveredAt
      ? delivery.deliveredAt.toISOString()
      : null,
  };
}

export function toOrderSummary(order: {
  id: string;
  number: string;
  status: string;
  pieces: number;
  total: number;
  store: { name: string };
}): OrderSummary {
  return {
    id: order.id,
    number: order.number,
    status: order.status,
    storeName: order.store.name,
    pieces: order.pieces,
    total: order.total,
  };
}
