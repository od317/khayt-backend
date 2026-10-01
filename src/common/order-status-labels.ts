import { DeliveryStatus, OrderStatus } from '@prisma/client';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  review: 'قيد المراجعة',
  preparing: 'قيد التجهيز',
  ready: 'جاهز للتسليم',
  in_transit: 'قيد التوصيل',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
  failed: 'فشل التسليم',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  review: '#F59E0B',
  preparing: '#3B82F6',
  ready: '#10B981',
  in_transit: '#8B5CF6',
  delivered: '#16A34A',
  cancelled: '#9CA3AF',
  failed: '#DC2626',
};

export function orderStatusColor(status: OrderStatus): string {
  return ORDER_STATUS_COLORS[status];
}

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  unassigned: 'بانتظار التعيين',
  in_transit: 'قيد التوصيل',
  delivered: 'تم التسليم',
  failed: 'فشل التسليم',
};
