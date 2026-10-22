import { describe, expect, it } from 'vitest';
import { toCartItemResponse, toCartResponse } from './cart.mapper';

const baseProduct = {
  id: 'prod-1',
  name: 'قميص',
  category: 'قمصان',
  description: null,
  images: ['/a.jpg'],
  unit: 'قطعة',
  price: 10000,
  inWarehouse: true,
  available: true,
  guarantee: false,
  supplierBusinessId: null,
  deletedAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  packaging: null,
  discount: null,
  offer: null,
  variants: {
    axes: [
      { key: 'color', label: 'لون' },
      { key: 'size', label: 'قياس' },
    ],
    options: [
      {
        name: 'أحمر',
        discountPercent: 10,
        image: '/red.jpg',
        children: [{ name: 'M' }, { name: 'L' }, { name: 'XL' }],
      },
      {
        name: 'أسود',
        image: '/black.jpg',
        children: [{ name: 'M' }, { name: 'L' }, { name: 'XL' }],
      },
    ],
  },
  saleRule: null as unknown,
};

function cartItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cart-1',
    userId: 'user-1',
    productId: 'prod-1',
    quantity: 1,
    variant: { color: 'أحمر', size: 'M' },
    variantKey: 'color:أحمر|size:M',
    createdAt: new Date(),
    updatedAt: new Date(),
    product: { ...baseProduct },
    ...overrides,
  } as Parameters<typeof toCartItemResponse>[0];
}

describe('cart.mapper', () => {
  it('applies free-mode color discount to unitPrice and lineTotal', () => {
    const result = toCartItemResponse(cartItem({ quantity: 2 }));
    expect(result.originalUnitPrice).toBe(10000);
    expect(result.unitPrice).toBe(9000);
    expect(result.totalPieces).toBe(2);
    expect(result.unitsPerPack).toBeNull();
    expect(result.packPrice).toBeNull();
    expect(result.breakdown).toBeNull();
    expect(result.lineTotal).toBe(18000);
  });

  it('exposes pack breakdown and unitsPerPack for color_pair_pack', () => {
    const result = toCartItemResponse(
      cartItem({
        quantity: 2,
        variant: { color: 'أحمر', pairColor: 'أسود' },
        variantKey: 'color:أحمر|pairColor:أسود',
        product: {
          ...baseProduct,
          saleRule: {
            mode: 'color_pair_pack',
            sizePack: { sizes: ['M', 'L', 'XL'], qtyPerSize: 5 },
            allowedPairColors: ['أسود'],
          },
        },
      }),
    );

    expect(result.unitsPerPack).toBe(30);
    expect(result.packPrice).toBe(300000);
    expect(result.totalPieces).toBe(60);
    expect(result.breakdown).toHaveLength(6);
    expect(result.breakdown?.[0]).toEqual({
      color: 'أحمر',
      size: 'M',
      qty: 10,
    });
    expect(result.lineTotal).toBe(10000 * 60);
  });

  it('sums totalItems as totalPieces across the cart', () => {
    const cart = toCartResponse([
      cartItem({
        quantity: 1,
        variant: { color: 'أحمر' },
        product: {
          ...baseProduct,
          saleRule: {
            mode: 'color_size_pack',
            sizePack: { sizes: ['M', 'L'], qtyPerSize: 1 },
          },
        },
      }),
    ]);
    expect(cart.totals.totalItems).toBe(2);
  });

  it('uses per-color sizePack when product saleRule is null', () => {
    const result = toCartItemResponse(
      cartItem({
        quantity: 2,
        variant: { color: 'أسود' },
        variantKey: 'color:أسود',
        product: {
          ...baseProduct,
          saleRule: null,
          variants: {
            axes: [
              { key: 'color', label: 'لون' },
              { key: 'size', label: 'قياس' },
            ],
            options: [
              {
                name: 'أحمر',
                image: '/red.jpg',
                children: [{ name: 'M' }, { name: 'L' }],
              },
              {
                name: 'أسود',
                image: '/black.jpg',
                sizePack: { sizes: ['M', 'L', 'XL'], qtyPerSize: 1 },
                children: [{ name: 'M' }, { name: 'L' }, { name: 'XL' }],
              },
            ],
          },
        },
      }),
    );
    expect(result.unitsPerPack).toBe(3);
    expect(result.totalPieces).toBe(6);
    expect(result.breakdown).toEqual([
      { color: 'أسود', size: 'M', qty: 2 },
      { color: 'أسود', size: 'L', qty: 2 },
      { color: 'أسود', size: 'XL', qty: 2 },
    ]);
  });
});
