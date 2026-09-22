import { Business, BusinessType } from '@prisma/client';
import { Supply } from '@prisma/client';

export type BusinessResponse = {
  id: string;
  type: BusinessType;
  name: string;
  location: string;
  description: string | null;
  phone: string | null;
  imageUrl: string | null;
  verified: boolean;
  capacity: string | null;
  equipment: string | null;
  minOrder: string | null;
  experience: string | null;
  duration: string | null;
  topics: string[];
  createdAt: string;
};

export type SupplyLineResponse = {
  productId: string;
  productName: string;
  sent: number;
  remaining: number;
  sold: number;
  unit: string;
  unitPrice: number;
};

export function toBusinessResponse(business: Business): BusinessResponse {
  return {
    id: business.id,
    type: business.type,
    name: business.name,
    location: business.location,
    description: business.description,
    phone: business.phone,
    imageUrl: business.imageUrl,
    verified: business.verified,
    capacity: business.capacity,
    equipment: business.equipment,
    minOrder: business.minOrder,
    experience: business.experience,
    duration: business.duration,
    topics: business.topics,
    createdAt: business.createdAt.toISOString(),
  };
}

export function toSupplyLineResponse(
  supply: Supply,
  productName: string,
  unit: string,
): SupplyLineResponse {
  return {
    productId: supply.productId,
    productName,
    sent: supply.sent,
    remaining: supply.remaining,
    sold: supply.sent - supply.remaining,
    unit,
    unitPrice: supply.unitPrice,
  };
}
