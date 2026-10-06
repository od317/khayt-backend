import { Business, BusinessType, Supply } from '@prisma/client';

export type BusinessCategoryResponse = {
  id: string;
  name: string;
  slug: string;
};

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
  services: string[];
  duration: string | null;
  topics: string[];
  categories: BusinessCategoryResponse[]; // 👈 NEW
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

/** Accepts optional `categories` relation from Prisma. */
export function toBusinessResponse(
  business: Business & {
    categories?: {
      category: { id: string; name: string; slug: string };
    }[];
  },
): BusinessResponse {
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
    services: business.services,
    duration: business.duration,
    topics: business.topics,
    categories: (business.categories ?? []).map((row) => ({
      id: row.category.id,
      name: row.category.name,
      slug: row.category.slug,
    })),
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