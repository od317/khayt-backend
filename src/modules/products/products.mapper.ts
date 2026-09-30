import { Product } from '@prisma/client';

export type ProductResponse = {
  id: string;
  businessId: string;
  name: string;
  category: string;
  description: string | null;
  images: string[];
  unit: string;
  price: number;
  inWarehouse: boolean;
  available: boolean;
  variants: unknown;
  packaging: unknown;
  discount: unknown;
  offer: string | null;
  createdAt: string;
  businessName?: string;
  businessLocation?: string;
};

export function toProductResponse(product: Product): ProductResponse {
  return {
    id: product.id,
    businessId: product.businessId,
    name: product.name,
    category: product.category,
    description: product.description,
    images: product.images,
    unit: product.unit,
    price: product.price,
    inWarehouse: product.inWarehouse,
    available: product.available,
    variants: product.variants,
    packaging: product.packaging,
    discount: product.discount,
    offer: product.offer,
    createdAt: product.createdAt.toISOString(),
  };
}

export function withBusiness(
  product: Product,
  businessName: string,
  businessLocation: string,
): ProductResponse {
  return {
    ...toProductResponse(product),
    businessName,
    businessLocation,
  };
}
