import { Product } from '@prisma/client';
import {
  SaleRuleResponse,
  toSaleRuleResponse,
} from './sale-rule';

export type ColorImagesResponse = {
  name: string;
  hex: string | null;
  /** Primary image for this color (same as images[0]). */
  image: string;
  /** All images for this color — FE switches gallery when color changes. */
  images: string[];
};

export type ProductResponse = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  images: string[];
  unit: string;
  price: number;
  inWarehouse: boolean;
  available: boolean;
  guarantee: boolean;
  /** Workshop the goods came from; null until set / received. */
  supplierBusinessId: string | null;
  variants: unknown;
  /** Color → images map derived from variants when the first axis is `color`. */
  colorImages: ColorImagesResponse[];
  packaging: unknown;
  discount: unknown;
  offer: string | null;
  /**
   * When set, qty 1 buys every option of `lockedAxis` (e.g. all 3 colors).
   * Frontend must not let the user pick that axis.
   */
  saleRule: SaleRuleResponse | null;
  createdAt: string;
};

type VariantOptionLike = {
  name?: unknown;
  hex?: unknown;
  image?: unknown;
  images?: unknown;
};

type VariantTreeLike = {
  axes?: { key?: unknown }[];
  options?: VariantOptionLike[];
};

export function toColorImages(variants: unknown): ColorImagesResponse[] {
  if (!variants || typeof variants !== 'object') return [];
  const tree = variants as VariantTreeLike;
  const firstAxis = tree.axes?.[0]?.key;
  if (firstAxis !== 'color' || !Array.isArray(tree.options)) return [];

  return tree.options.flatMap((option) => {
    if (typeof option.name !== 'string' || !option.name.trim()) return [];

    const fromImages = Array.isArray(option.images)
      ? option.images.filter(
          (url): url is string => typeof url === 'string' && url.trim() !== '',
        )
      : [];
    const primary =
      typeof option.image === 'string' && option.image.trim()
        ? option.image.trim()
        : fromImages[0];
    if (!primary) return [];

    const images = fromImages.length > 0 ? fromImages : [primary];

    return [
      {
        name: option.name,
        hex: typeof option.hex === 'string' ? option.hex : null,
        image: primary,
        images,
      },
    ];
  });
}

export function toProductResponse(product: Product): ProductResponse {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    description: product.description,
    images: product.images,
    unit: product.unit,
    price: product.price,
    inWarehouse: product.inWarehouse,
    available: product.available,
    guarantee: product.guarantee,
    supplierBusinessId: product.supplierBusinessId ?? null,
    variants: product.variants,
    colorImages: toColorImages(product.variants),
    packaging: product.packaging,
    discount: product.discount,
    offer: product.offer,
    saleRule: toSaleRuleResponse(product.saleRule, product.variants),
    createdAt: product.createdAt.toISOString(),
  };
}
