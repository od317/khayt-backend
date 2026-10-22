import { CartItem, Product } from '@prisma/client';
import {
  buildBreakdownFromResolved,
  parseSaleRuleStored,
  pieceUnitPrice,
  resolveCartSale,
  type PackBreakdownLine,
} from '../products/sale-rule';

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
  /** Packs for pack sale modes; pieces for free / locked_axis. */
  quantity: number;
  /** Pieces included in one pack; null when quantity is already pieces. */
  unitsPerPack: number | null;
  /** Total physical pieces (quantity * unitsPerPack, or quantity). */
  totalPieces: number;
  /** Expanded color/size lines for pack modes; null otherwise. */
  breakdown: PackBreakdownLine[] | null;
  /** Product list price per piece (before free-mode color discount). */
  originalUnitPrice: number;
  /** Effective unit price per piece (after free-mode color discount). */
  unitPrice: number;
  variant: Record<string, string> | null;
  variantKey: string;
  product: CartItemProductResponse;
  lineTotal: number;
  available: boolean;
  unavailableReason: string | null;
};

export type CartTotalsResponse = {
  distinctProducts: number;
  /** Sum of totalPieces across lines. */
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
    if (!secondValue) {
      // Pack modes only select color — use the color option image.
      return option.image ?? null;
    }

    const children = Array.isArray(option.children) ? option.children : [];
    const child = children.find((c) => c?.name === secondValue);
    return child?.image ?? option.image ?? null;
  }

  return option.image ?? null;
}

export function toCartItemResponse(item: CartItemWithProduct): CartItemResponse {
  const product = item.product;
  const variant =
    item.variant && typeof item.variant === 'object' && !Array.isArray(item.variant)
      ? (item.variant as Record<string, string>)
      : null;

  const rule = parseSaleRuleStored(product.saleRule);
  const resolved = resolveCartSale(product.saleRule, product.variants, variant);
  const perPack = resolved.type === 'pack' ? resolved.unitsPerPack : null;
  const breakdown =
    resolved.type === 'pack'
      ? buildBreakdownFromResolved(resolved, item.quantity)
      : null;
  const totalPieces =
    perPack !== null ? item.quantity * perPack : item.quantity;

  const originalUnitPrice = product.price;
  const unitPrice = pieceUnitPrice(
    product.price,
    product.variants,
    variant,
    rule,
  );
  const lineTotal = unitPrice * totalPieces;
  const available = product.available && product.deletedAt === null;

  const unavailableReason = !product.deletedAt
    ? !product.available
      ? 'المنتج غير متوفر حالياً'
      : null
    : 'تم حذف المنتج';

  return {
    id: item.id,
    quantity: item.quantity,
    unitsPerPack: perPack,
    totalPieces,
    breakdown,
    originalUnitPrice,
    unitPrice,
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
    totalItems: shaped.reduce((sum, item) => sum + item.totalPieces, 0),
    subtotal: shaped.reduce((sum, item) => sum + item.lineTotal, 0),
  };

  return { items: shaped, totals };
}
