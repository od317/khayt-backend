import { CartItem, Product } from '@prisma/client';

export type CartItemProductResponse = {
  id: string;
  name: string;
  price: number;
  unit: string;
  images: string[];
  available: boolean;
  inWarehouse: boolean;
  guarantee: boolean;
  /** URL of the variant image for the selected options, if one exists. */
  variantImage: string | null;
};

export type CartItemResponse = {
  id: string;
  quantity: number;
  variant: Record<string, string> | null;
  variantKey: string;
  product: CartItemProductResponse;
  lineTotal: number;
  available: boolean;
  unavailableReason: string | null;
};

export type CartTotalsResponse = {
  distinctProducts: number;
  totalItems: number;
  subtotal: number;
};

export type CartResponse = {
  items: CartItemResponse[];
  totals: CartTotalsResponse;
};

type CartItemWithProduct = CartItem & {
  product: Product;
};

/**
 * Finds the image URL for the selected variant options inside the product's
 * `variants` JSON tree.
 *
 * The product variants shape is:
 *   { axes: [{ key, label }], options: [{ name, image, hex, children? }] }
 *
 * - With 1 axis: options match the axis value directly.
 * - With 2 axes: options are the first axis; children are the second.
 *
 * Returns null if no image is found or the variant tree is malformed.
 */
function resolveVariantImage(
  variants: unknown,
  selected: Record<string, string> | null,
): string | null {
  if (!selected || !variants || typeof variants !== 'object') return null;

  const v = variants as {
    axes?: { key?: string }[];
    options?: {
      name?: string;
      image?: string;
      children?: { name?: string; image?: string }[];
    }[];
  };

  const axes = Array.isArray(v.axes) ? v.axes : [];
  const options = Array.isArray(v.options) ? v.options : [];

  if (axes.length === 0) return null;

  const firstKey = axes[0]?.key;
  const firstValue = firstKey ? selected[firstKey] : undefined;
  if (!firstValue) return null;

  const option = options.find((o) => o?.name === firstValue);
  if (!option) return null;

  if (axes.length === 2) {
    const secondKey = axes[1]?.key;
    const secondValue = secondKey ? selected[secondKey] : undefined;
    if (!secondValue) return null;

    const children = Array.isArray(option.children) ? option.children : [];
    const child = children.find((c) => c?.name === secondValue);
    return child?.image ?? null;
  }

  return option.image ?? null;
}

export function toCartItemResponse(item: CartItemWithProduct): CartItemResponse {
  const product = item.product;
  const variant =
    item.variant && typeof item.variant === 'object'
      ? (item.variant as Record<string, string>)
      : null;

  const lineTotal = product.price * item.quantity;
  const available = product.available && product.deletedAt === null;

  const unavailableReason = !product.deletedAt
    ? !product.available
      ? 'المنتج غير متوفر حالياً'
      : null
    : 'تم حذف المنتج';

  return {
    id: item.id,
    quantity: item.quantity,
    variant,
    variantKey: item.variantKey,
    product: {
      id: product.id,
      name: product.name,
      price: product.price,
      unit: product.unit,
      images: product.images,
      available: product.available,
      inWarehouse: product.inWarehouse,
      guarantee: product.guarantee,
      variantImage: resolveVariantImage(product.variants, variant),
    },
    lineTotal,
    available,
    unavailableReason,
  };
}

export function toCartResponse(items: CartItemWithProduct[]): CartResponse {
  const shaped = items.map(toCartItemResponse);

  const totals: CartTotalsResponse = {
    distinctProducts: shaped.length,
    totalItems: shaped.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: shaped.reduce((sum, item) => sum + item.lineTotal, 0),
  };

  return { items: shaped, totals };
}
