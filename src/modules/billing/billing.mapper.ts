import {
  Bill,
  BillStatus,
  Business,
  Payment,
  PaymentType,
  Receiving,
  User,
} from '@prisma/client';

export type BusinessSummary = {
  id: string;
  name: string;
  type: string;
  location: string;
  verified: boolean;
};

export type ReceivingResponse = {
  id: string;
  number: string;
  businessId: string;
  businessName: string;
  receivedAt: string;
  paymentType: PaymentType;
  total: number;
  createdAt: string;
};

export type ReceivingLineResponse = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
};

export type BillResponse = {
  id: string;
  number: string;
  businessId: string;
  businessName: string;
  receivingId: string;
  paymentType: PaymentType;
  status: BillStatus;
  issuedAt: string;
  dueAt: string | null;
  total: number;
  paid: number;
  remaining: number;
  createdAt: string;
};

export type BillLineResponse = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type PaymentResponse = {
  id: string;
  amount: number;
  paidAt: string;
  recordedBy: string;
  recordedByName: string | null;
};

export type ReceivingSummary = {
  id: string;
  number: string;
  receivedAt: string;
};

export function toBusinessSummary(business: Business): BusinessSummary {
  return {
    id: business.id,
    name: business.name,
    type: business.type,
    location: business.location,
    verified: business.verified,
  };
}

export function toReceivingResponse(
  receiving: Receiving & { business: Business },
  total: number,
): ReceivingResponse {
  return {
    id: receiving.id,
    number: receiving.number,
    businessId: receiving.businessId,
    businessName: receiving.business.name,
    receivedAt: receiving.receivedAt.toISOString(),
    paymentType: receiving.paymentType,
    total,
    createdAt: receiving.createdAt.toISOString(),
  };
}

export function toReceivingLineResponse(line: {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  product: { name: string };
}): ReceivingLineResponse {
  return {
    id: line.id,
    productId: line.productId,
    productName: line.product.name,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
  };
}

export function toBillResponse(
  bill: Bill & { business: Business },
): BillResponse {
  return {
    id: bill.id,
    number: bill.number,
    businessId: bill.businessId,
    businessName: bill.business.name,
    receivingId: bill.receivingId,
    paymentType: bill.paymentType,
    status: bill.status,
    issuedAt: bill.issuedAt.toISOString(),
    dueAt: bill.dueAt ? bill.dueAt.toISOString() : null,
    total: bill.total,
    paid: bill.paid,
    remaining: bill.total - bill.paid,
    createdAt: bill.createdAt.toISOString(),
  };
}

export function toBillLineResponse(line: {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  product: { name: string };
}): BillLineResponse {
  return {
    id: line.id,
    productId: line.productId,
    productName: line.product.name,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    total: line.quantity * line.unitPrice,
  };
}

export function toPaymentResponse(
  payment: Payment & { recorder: User },
): PaymentResponse {
  return {
    id: payment.id,
    amount: payment.amount,
    paidAt: payment.paidAt.toISOString(),
    recordedBy: payment.recordedBy,
    recordedByName: payment.recorder.name,
  };
}

export function toReceivingSummary(receiving: Receiving): ReceivingSummary {
  return {
    id: receiving.id,
    number: receiving.number,
    receivedAt: receiving.receivedAt.toISOString(),
  };
}

export type ReceivingDetailResponse = {
  receiving: ReceivingResponse;
  lines: ReceivingLineResponse[];
  bill: BillResponse;
};

export type BillDetailResponse = {
  bill: BillResponse;
  lines: BillLineResponse[];
  payments: PaymentResponse[];
  business: BusinessSummary;
  receiving: ReceivingSummary;
};
