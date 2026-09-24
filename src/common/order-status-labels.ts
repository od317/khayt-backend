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

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  unassigned: 'بانتظار التعيين',
  in_transit: 'قيد التوصيل',
  delivered: 'تم التسليم',
  failed: 'فشل التسليم',
};
