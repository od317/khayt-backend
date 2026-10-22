import { Product } from '@prisma/client';
import {
  parseSizePack,
  sizePackUnits,
  SaleRuleResponse,
  toSaleRuleResponse,
  type SizePack,
} from './sale-rule';

export type ColorImagesResponse = {
  name: string;
  hex: string | null;
  /** Primary image for this color (same as images[0]). */
  image: string;
  /** All images for this color — FE switches gallery when color changes. */
  images: string[];
  /** Product list price (before this color’s discount). */
  originalPrice: number;
  /** Price after color `discountPercent` (same as originalPrice when none). */
  price: number;
  /** Free-size color discount; null when none. */
  discountPercent: number | null;
  /**
   * `free` = buyer picks size for this color.
   * `pack` = admin sizePack; buyer must not send size.
   */
  sizeMode: 'free' | 'pack';
  /** Present when sizeMode is pack. */
  sizePack: SizePack | null;
  /** Pieces in one pack for this color; null when free. */
  unitsPerPack: number | null;
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
   * Sale mode for the FE picker / cart.
   * null = free (pick color + size). See SaleRuleResponse modes.
   */
  saleRule: SaleRuleResponse | null;
  createdAt: string;
};

type VariantOptionLike = {
  name?: unknown;
  hex?: unknown;
  image?: unknown;
  images?: unknown;
  discountPercent?: unknown;
  sizePack?: unknown;
};

type VariantTreeLike = {
  axes?: { key?: unknown }[];
  options?: VariantOptionLike[];
};

function colorDiscountPercent(option: VariantOptionLike): number | null {
  const pct = option.discountPercent;
  if (typeof pct !== 'number' || !Number.isFinite(pct) || pct <= 0 || pct > 100) {
    return null;
  }
  return Math.round(pct);
}

export function toColorImages(
  variants: unknown,
  basePrice = 0,
): ColorImagesResponse[] {
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
    const sizePack = parseSizePack(option.sizePack);
    const sizeMode = sizePack ? ('pack' as const) : ('free' as const);
    // Color discount only meaningful when the buyer picks size freely.
    const discountPercent =
      sizeMode === 'free' ? colorDiscountPercent(option) : null;
    const originalPrice = basePrice;
    const price =
      discountPercent === null
        ? originalPrice
        : Math.round(originalPrice * (1 - discountPercent / 100));

    return [
      {
        name: option.name,
        hex: typeof option.hex === 'string' ? option.hex : null,
        image: primary,
        images,
        originalPrice,
        price,
        discountPercent,
        sizeMode,
        sizePack,
        unitsPerPack: sizePack ? sizePackUnits(sizePack, 1) : null,
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
    colorImages: toColorImages(product.variants, product.price),
    packaging: product.packaging,
    discount: product.discount,
    offer: product.offer,
    saleRule: toSaleRuleResponse(product.saleRule, product.variants),
    createdAt: product.createdAt.toISOString(),
  };
}
