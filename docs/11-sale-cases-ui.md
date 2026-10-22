# Sale / cart UI cases (FE contract)

Demo product ids (after `prisma/seed-sale-modes-demo.sql`):

| id | `saleCase` | UI |
|----|------------|-----|
| `prod-sale-free` | `free` | Pick color + size; optional color discount |
| `prod-sale-mixed` | `mixed` | Some colors free size, some admin pack |
| `prod-sale-pair` | `color_pair_pack` | Pick color + pairColor; sizes forced |
| `prod-sale-locked` | `locked_axis` | Locked color set; pick size only |

Auth for cart: **store or workshop** bearer token. Base path: `/api`.

Image URLs below match the seed (`IMG1` / `IMG2` / `IMG3`):

```
IMG1 = https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQNO36XKY6a7gCZq0CK5bQrqrMjc-VhMWm9QQVwp4TNoQ&s=10
IMG2 = https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTa1QmlzxwBlPlhmh6w8BM8dXFL2S3ZP4bguvtm95gAPA&s=10
IMG3 = https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQhR3LHcBAtCvq4XSONggJ4YkLOAKw__X9FhcNn2Ub_vw&s=10
```

---

## FE switch (required)

Prefer **`product.saleCase`** over inferring from `saleRule` + `colorImages`.

| `saleCase` | Buyer picks | Cart `quantity` means | Show pack/set price from |
|------------|-------------|------------------------|---------------------------|
| `free` | `{ color, size }` | pieces | — (`colorImages[].price` for unit) |
| `mixed` | free color → `{ color, size }`; pack color → `{ color }` | pieces or packs | `colorImages[].packPrice` when `sizeMode === "pack"` |
| `color_size_pack` | `{ color }` | packs | `product.packPrice` / `saleRule.packPrice` |
| `color_pair_pack` | `{ color, pairColor }` | packs | `product.packPrice` / `saleRule.packPrice`; seconds from `saleRule.pairWith[color]` |
| `locked_axis` | unlocked axis only (e.g. `{ size }`) | pieces | — |

**New fields (this release):**

- `product.packPrice` — product-wide set price; `null` for free/mixed/locked
- `colorImages[].packPrice` — per-color set price when `sizeMode === "pack"`
- `saleRule.packPrice` — same as product for pack modes
- `saleRule.pairWith` — map first color → allowed second colors (pair UI)
- `saleRule.allowedPairColors` — flat union of all seconds (convenience; prefer `pairWith`)
- cart line `packPrice` — price of **one** pack step (`unitPrice × unitsPerPack`); `null` when not a pack

---

## Shared cart shapes

### `POST /api/cart/items` body

```json
{
  "productId": "prod-sale-…",
  "quantity": 1,
  "variant": { }
}
```

### Cart line (common fields)

```json
{
  "id": "cart-uuid",
  "quantity": 1,
  "unitsPerPack": null,
  "totalPieces": 1,
  "breakdown": null,
  "originalUnitPrice": 45000,
  "unitPrice": 45000,
  "packPrice": null,
  "variant": {},
  "variantKey": "…",
  "product": {
    "id": "…",
    "name": "…",
    "price": 45000,
    "unit": "قطعة",
    "images": ["IMG1", "IMG2"],
    "available": true,
    "inWarehouse": true,
    "guarantee": true,
    "variantImage": "IMG1"
  },
  "lineTotal": 45000,
  "available": true,
  "unavailableReason": null
}
```

### `GET /api/cart`

```json
{
  "items": [ /* CartItemResponse[] */ ],
  "totals": {
    "distinctProducts": 1,
    "totalItems": 2,
    "subtotal": 81000
  }
}
```

`totals.totalItems` = sum of **`totalPieces`** (not packs).

### `POST /api/cart/checkout`

```json
{
  "address": "دمشق - المزة",
  "lat": 33.5138,
  "lng": 36.2765
}
```

Pack lines expand into one order line per `{ color, size }` with piece quantities. Cart clears after success. Response = order detail (same as `POST /api/orders`).

---

# Case 1 — `free` (`prod-sale-free`)

**Flow:** list colors → pick size → add pieces. أحمر has 10% discount (`originalPrice` / `price` on that color).

### Product

```http
GET /api/products/prod-sale-free
```

```json
{
  "product": {
    "id": "prod-sale-free",
    "name": "قميص اختيار حر",
    "category": "قمصان",
    "description": "ألوان حرة + خصم على الأحمر",
    "images": ["IMG1", "IMG2"],
    "unit": "قطعة",
    "price": 45000,
    "inWarehouse": true,
    "available": true,
    "guarantee": true,
    "supplierBusinessId": null,
    "variants": {
      "axes": [
        { "key": "color", "label": "لون" },
        { "key": "size", "label": "قياس" }
      ],
      "options": [
        {
          "name": "أحمر",
          "hex": "#DC2626",
          "discountPercent": 10,
          "image": "IMG1",
          "images": ["IMG1"],
          "children": [
            { "name": "M", "image": "IMG1" },
            { "name": "L", "image": "IMG1" },
            { "name": "XL", "image": "IMG1" }
          ]
        },
        {
          "name": "أزرق",
          "hex": "#2563EB",
          "image": "IMG2",
          "images": ["IMG2"],
          "children": [
            { "name": "M", "image": "IMG2" },
            { "name": "L", "image": "IMG2" },
            { "name": "XL", "image": "IMG2" }
          ]
        },
        {
          "name": "أسود",
          "hex": "#111827",
          "image": "IMG3",
          "images": ["IMG3"],
          "children": [
            { "name": "M", "image": "IMG3" },
            { "name": "L", "image": "IMG3" },
            { "name": "XL", "image": "IMG3" }
          ]
        }
      ]
    },
    "colorImages": [
      {
        "name": "أحمر",
        "hex": "#DC2626",
        "image": "IMG1",
        "images": ["IMG1"],
        "originalPrice": 45000,
        "price": 40500,
        "discountPercent": 10,
        "sizeMode": "free",
        "sizePack": null,
        "unitsPerPack": null,
        "packPrice": null
      },
      {
        "name": "أزرق",
        "hex": "#2563EB",
        "image": "IMG2",
        "images": ["IMG2"],
        "originalPrice": 45000,
        "price": 45000,
        "discountPercent": null,
        "sizeMode": "free",
        "sizePack": null,
        "unitsPerPack": null,
        "packPrice": null
      },
      {
        "name": "أسود",
        "hex": "#111827",
        "image": "IMG3",
        "images": ["IMG3"],
        "originalPrice": 45000,
        "price": 45000,
        "discountPercent": null,
        "sizeMode": "free",
        "sizePack": null,
        "unitsPerPack": null,
        "packPrice": null
      }
    ],
    "packaging": null,
    "discount": null,
    "offer": null,
    "saleCase": "free",
    "packPrice": null,
    "saleRule": null,
    "createdAt": "2026-10-22T07:00:00.000Z"
  },
  "availableQuantity": 120
}
```

### Add to cart

```http
POST /api/cart/items
Authorization: Bearer <store-access-token>
Content-Type: application/json
```

```json
{
  "productId": "prod-sale-free",
  "quantity": 2,
  "variant": { "color": "أحمر", "size": "M" }
}
```

```json
{
  "id": "c1111111-1111-1111-1111-111111111111",
  "quantity": 2,
  "unitsPerPack": null,
  "totalPieces": 2,
  "breakdown": null,
  "originalUnitPrice": 45000,
  "unitPrice": 40500,
  "packPrice": null,
  "variant": { "color": "أحمر", "size": "M" },
  "variantKey": "color:أحمر|size:M",
  "product": {
    "id": "prod-sale-free",
    "name": "قميص اختيار حر",
    "price": 45000,
    "unit": "قطعة",
    "images": ["IMG1", "IMG2"],
    "available": true,
    "inWarehouse": true,
    "guarantee": true,
    "variantImage": "IMG1"
  },
  "lineTotal": 81000,
  "available": true,
  "unavailableReason": null
}
```

### Checkout expand

One order line: أحمر / M × 2 pieces @ 40500.

---

# Case 2 — `mixed` (`prod-sale-mixed`)

**Flow:** switch UI **per selected color** using `colorImages[].sizeMode`.

- أحمر / أزرق: `sizeMode: "free"` → pick size; discount on أحمر
- أسود: `sizeMode: "pack"` → hide size picker; qty = packs; show `packPrice`

`product.packPrice` is `null` (not a product-wide pack).

### Product (abridged `variants`; full tree same as seed)

```http
GET /api/products/prod-sale-mixed
```

```json
{
  "product": {
    "id": "prod-sale-mixed",
    "name": "قميص مختلط الألوان",
    "category": "قمصان",
    "description": "أحمر حر+خصم، أسود طقم قياسات إداري",
    "images": ["IMG1", "IMG2"],
    "unit": "قطعة",
    "price": 45000,
    "inWarehouse": true,
    "available": true,
    "guarantee": true,
    "supplierBusinessId": null,
    "variants": {
      "axes": [
        { "key": "color", "label": "لون" },
        { "key": "size", "label": "قياس" }
      ],
      "options": [
        {
          "name": "أحمر",
          "hex": "#DC2626",
          "discountPercent": 10,
          "image": "IMG1",
          "images": ["IMG1"],
          "children": [
            { "name": "M", "image": "IMG1" },
            { "name": "L", "image": "IMG1" },
            { "name": "XL", "image": "IMG1" }
          ]
        },
        {
          "name": "أزرق",
          "hex": "#2563EB",
          "image": "IMG2",
          "images": ["IMG2"],
          "children": [
            { "name": "M", "image": "IMG2" },
            { "name": "L", "image": "IMG2" },
            { "name": "XL", "image": "IMG2" }
          ]
        },
        {
          "name": "أسود",
          "hex": "#111827",
          "image": "IMG3",
          "images": ["IMG3"],
          "sizePack": { "sizes": ["M", "L", "XL"], "qtyPerSize": 1 },
          "children": [
            { "name": "M", "image": "IMG3" },
            { "name": "L", "image": "IMG3" },
            { "name": "XL", "image": "IMG3" }
          ]
        }
      ]
    },
    "colorImages": [
      {
        "name": "أحمر",
        "hex": "#DC2626",
        "image": "IMG1",
        "images": ["IMG1"],
        "originalPrice": 45000,
        "price": 40500,
        "discountPercent": 10,
        "sizeMode": "free",
        "sizePack": null,
        "unitsPerPack": null,
        "packPrice": null
      },
      {
        "name": "أزرق",
        "hex": "#2563EB",
        "image": "IMG2",
        "images": ["IMG2"],
        "originalPrice": 45000,
        "price": 45000,
        "discountPercent": null,
        "sizeMode": "free",
        "sizePack": null,
        "unitsPerPack": null,
        "packPrice": null
      },
      {
        "name": "أسود",
        "hex": "#111827",
        "image": "IMG3",
        "images": ["IMG3"],
        "originalPrice": 45000,
        "price": 45000,
        "discountPercent": null,
        "sizeMode": "pack",
        "sizePack": { "sizes": ["M", "L", "XL"], "qtyPerSize": 1 },
        "unitsPerPack": 3,
        "packPrice": 135000
      }
    ],
    "packaging": null,
    "discount": null,
    "offer": null,
    "saleCase": "mixed",
    "packPrice": null,
    "saleRule": null,
    "createdAt": "2026-10-22T07:00:00.000Z"
  },
  "availableQuantity": 120
}
```

### Cart — free color

```json
{
  "productId": "prod-sale-mixed",
  "quantity": 1,
  "variant": { "color": "أحمر", "size": "L" }
}
```

→ `unitsPerPack: null`, `packPrice: null`, `unitPrice: 40500`, `totalPieces: 1`.

### Cart — pack color (2 packs)

```json
{
  "productId": "prod-sale-mixed",
  "quantity": 2,
  "variant": { "color": "أسود" }
}
```

```json
{
  "id": "c2222222-2222-2222-2222-222222222222",
  "quantity": 2,
  "unitsPerPack": 3,
  "totalPieces": 6,
  "breakdown": [
    { "color": "أسود", "size": "M", "qty": 2 },
    { "color": "أسود", "size": "L", "qty": 2 },
    { "color": "أسود", "size": "XL", "qty": 2 }
  ],
  "originalUnitPrice": 45000,
  "unitPrice": 45000,
  "packPrice": 135000,
  "variant": { "color": "أسود" },
  "variantKey": "color:أسود",
  "product": {
    "id": "prod-sale-mixed",
    "name": "قميص مختلط الألوان",
    "price": 45000,
    "unit": "قطعة",
    "images": ["IMG1", "IMG2"],
    "available": true,
    "inWarehouse": true,
    "guarantee": true,
    "variantImage": "IMG3"
  },
  "lineTotal": 270000,
  "available": true,
  "unavailableReason": null
}
```

### Checkout expand (pack line)

Three order lines: أسود/M×2, أسود/L×2, أسود/XL×2.

---

# Case 3 — `color_pair_pack` (`prod-sale-pair`)

**Flow:** pick first color → second color options = `saleRule.pairWith[first]` only (demo: both أحمر and أزرق pair with **أسود** only). No size picker. Show set price `packPrice` (45000 × 30 = 1_350_000).

`unitsPerPack` = sizes × qtyPerSize × **2 colors** = 3 × 5 × 2 = 30.

### Product

```http
GET /api/products/prod-sale-pair
```

```json
{
  "product": {
    "id": "prod-sale-pair",
    "name": "طقم لونين",
    "category": "قمصان",
    "description": "لون + لون اقتران بقياسات إدارية",
    "images": ["IMG1", "IMG2"],
    "unit": "قطعة",
    "price": 45000,
    "inWarehouse": true,
    "available": true,
    "guarantee": true,
    "supplierBusinessId": null,
    "variants": {
      "axes": [
        { "key": "color", "label": "لون" },
        { "key": "size", "label": "قياس" }
      ],
      "options": [
        {
          "name": "أحمر",
          "hex": "#DC2626",
          "image": "IMG1",
          "images": ["IMG1"],
          "children": [
            { "name": "M", "image": "IMG1" },
            { "name": "L", "image": "IMG1" },
            { "name": "XL", "image": "IMG1" }
          ]
        },
        {
          "name": "أزرق",
          "hex": "#2563EB",
          "image": "IMG2",
          "images": ["IMG2"],
          "children": [
            { "name": "M", "image": "IMG2" },
            { "name": "L", "image": "IMG2" },
            { "name": "XL", "image": "IMG2" }
          ]
        },
        {
          "name": "أسود",
          "hex": "#111827",
          "image": "IMG3",
          "images": ["IMG3"],
          "children": [
            { "name": "M", "image": "IMG3" },
            { "name": "L", "image": "IMG3" },
            { "name": "XL", "image": "IMG3" }
          ]
        }
      ]
    },
    "colorImages": [
      {
        "name": "أحمر",
        "hex": "#DC2626",
        "image": "IMG1",
        "images": ["IMG1"],
        "originalPrice": 45000,
        "price": 45000,
        "discountPercent": null,
        "sizeMode": "free",
        "sizePack": null,
        "unitsPerPack": null,
        "packPrice": null
      },
      {
        "name": "أزرق",
        "hex": "#2563EB",
        "image": "IMG2",
        "images": ["IMG2"],
        "originalPrice": 45000,
        "price": 45000,
        "discountPercent": null,
        "sizeMode": "free",
        "sizePack": null,
        "unitsPerPack": null,
        "packPrice": null
      },
      {
        "name": "أسود",
        "hex": "#111827",
        "image": "IMG3",
        "images": ["IMG3"],
        "originalPrice": 45000,
        "price": 45000,
        "discountPercent": null,
        "sizeMode": "free",
        "sizePack": null,
        "unitsPerPack": null,
        "packPrice": null
      }
    ],
    "packaging": null,
    "discount": null,
    "offer": null,
    "saleCase": "color_pair_pack",
    "packPrice": 1350000,
    "saleRule": {
      "mode": "color_pair_pack",
      "sizePack": { "sizes": ["M", "L", "XL"], "qtyPerSize": 5 },
      "pairWith": {
        "أحمر": ["أسود"],
        "أزرق": ["أسود"]
      },
      "allowedPairColors": ["أسود"],
      "unitsPerPack": 30,
      "packPrice": 1350000
    },
    "createdAt": "2026-10-22T07:00:00.000Z"
  },
  "availableQuantity": 120
}
```

Note: for product-wide pack modes, `colorImages[].sizeMode` stays `"free"` (size is forced by `saleRule`, not per-color `sizePack`). Drive the UI from **`saleCase`**, not `colorImages.sizeMode`.

### Add to cart (1 pack)

```json
{
  "productId": "prod-sale-pair",
  "quantity": 1,
  "variant": { "color": "أحمر", "pairColor": "أسود" }
}
```

```json
{
  "id": "c3333333-3333-3333-3333-333333333333",
  "quantity": 1,
  "unitsPerPack": 30,
  "totalPieces": 30,
  "breakdown": [
    { "color": "أحمر", "size": "M", "qty": 5 },
    { "color": "أحمر", "size": "L", "qty": 5 },
    { "color": "أحمر", "size": "XL", "qty": 5 },
    { "color": "أسود", "size": "M", "qty": 5 },
    { "color": "أسود", "size": "L", "qty": 5 },
    { "color": "أسود", "size": "XL", "qty": 5 }
  ],
  "originalUnitPrice": 45000,
  "unitPrice": 45000,
  "packPrice": 1350000,
  "variant": { "color": "أحمر", "pairColor": "أسود" },
  "variantKey": "color:أحمر|pairColor:أسود",
  "product": {
    "id": "prod-sale-pair",
    "name": "طقم لونين",
    "price": 45000,
    "unit": "قطعة",
    "images": ["IMG1", "IMG2"],
    "available": true,
    "inWarehouse": true,
    "guarantee": true,
    "variantImage": "IMG1"
  },
  "lineTotal": 1350000,
  "available": true,
  "unavailableReason": null
}
```

Rejected examples:

- `{ "color": "أحمر", "pairColor": "أزرق" }` — not in `pairWith.أحمر`
- `{ "color": "أسود", "pairColor": "أحمر" }` — أسود is not a first-color key in `pairWith`
- sending `size` — validation error

### Checkout expand

Six order lines (each color × each size × 5).

---

# Case 4 — `locked_axis` (`prod-sale-locked`)

**Flow:** all colors sold as a set; buyer picks **size only**. No pack expansion; quantity = pieces of that size across the locked set (pricing stays per piece at list price).

### Product

```http
GET /api/products/prod-sale-locked
```

```json
{
  "product": {
    "id": "prod-sale-locked",
    "name": "طقم ألوان كامل",
    "category": "قمصان",
    "description": "كل الألوان معاً — اختر القياس فقط",
    "images": ["IMG1", "IMG2"],
    "unit": "قطعة",
    "price": 45000,
    "inWarehouse": true,
    "available": true,
    "guarantee": true,
    "supplierBusinessId": null,
    "variants": {
      "axes": [
        { "key": "color", "label": "لون" },
        { "key": "size", "label": "قياس" }
      ],
      "options": [
        {
          "name": "أحمر",
          "hex": "#DC2626",
          "image": "IMG1",
          "images": ["IMG1"],
          "children": [
            { "name": "M", "image": "IMG1" },
            { "name": "L", "image": "IMG1" },
            { "name": "XL", "image": "IMG1" }
          ]
        },
        {
          "name": "أزرق",
          "hex": "#2563EB",
          "image": "IMG2",
          "images": ["IMG2"],
          "children": [
            { "name": "M", "image": "IMG2" },
            { "name": "L", "image": "IMG2" },
            { "name": "XL", "image": "IMG2" }
          ]
        },
        {
          "name": "أسود",
          "hex": "#111827",
          "image": "IMG3",
          "images": ["IMG3"],
          "children": [
            { "name": "M", "image": "IMG3" },
            { "name": "L", "image": "IMG3" },
            { "name": "XL", "image": "IMG3" }
          ]
        }
      ]
    },
    "colorImages": [
      {
        "name": "أحمر",
        "hex": "#DC2626",
        "image": "IMG1",
        "images": ["IMG1"],
        "originalPrice": 45000,
        "price": 45000,
        "discountPercent": null,
        "sizeMode": "free",
        "sizePack": null,
        "unitsPerPack": null,
        "packPrice": null
      },
      {
        "name": "أزرق",
        "hex": "#2563EB",
        "image": "IMG2",
        "images": ["IMG2"],
        "originalPrice": 45000,
        "price": 45000,
        "discountPercent": null,
        "sizeMode": "free",
        "sizePack": null,
        "unitsPerPack": null,
        "packPrice": null
      },
      {
        "name": "أسود",
        "hex": "#111827",
        "image": "IMG3",
        "images": ["IMG3"],
        "originalPrice": 45000,
        "price": 45000,
        "discountPercent": null,
        "sizeMode": "free",
        "sizePack": null,
        "unitsPerPack": null,
        "packPrice": null
      }
    ],
    "packaging": null,
    "discount": null,
    "offer": null,
    "saleCase": "locked_axis",
    "packPrice": null,
    "saleRule": {
      "mode": "locked_axis",
      "lockedAxis": "color",
      "label": "لون",
      "options": ["أحمر", "أزرق", "أسود"],
      "optionCount": 3
    },
    "createdAt": "2026-10-22T07:00:00.000Z"
  },
  "availableQuantity": 120
}
```

UI hint: show locked colors from `saleRule.options` (read-only chips); picker only for size.

### Add to cart

```json
{
  "productId": "prod-sale-locked",
  "quantity": 3,
  "variant": { "size": "M" }
}
```

```json
{
  "id": "c4444444-4444-4444-4444-444444444444",
  "quantity": 3,
  "unitsPerPack": null,
  "totalPieces": 3,
  "breakdown": null,
  "originalUnitPrice": 45000,
  "unitPrice": 45000,
  "packPrice": null,
  "variant": { "size": "M" },
  "variantKey": "size:M",
  "product": {
    "id": "prod-sale-locked",
    "name": "طقم ألوان كامل",
    "price": 45000,
    "unit": "قطعة",
    "images": ["IMG1", "IMG2"],
    "available": true,
    "inWarehouse": true,
    "guarantee": true,
    "variantImage": null
  },
  "lineTotal": 135000,
  "available": true,
  "unavailableReason": null
}
```

Rejected: `{ "color": "أحمر", "size": "M" }` — locked axis must not be sent.

### Checkout

One order line with `variant: { size: "M" }`, quantity 3 (no pack expand).

---

## Case not in demo seed: `color_size_pack`

Same as pair but without `pairColor`: buyer sends `{ color }` only; `saleRule.mode === "color_size_pack"`; `product.packPrice = price × sizes × qtyPerSize`.

---

## Quick FE checklist

1. Switch screens on `saleCase`.
2. Show strikethrough with `colorImages[].originalPrice` / `.price` when discount.
3. Show set price from `packPrice` (product or per-color).
4. Pair seconds from `saleRule.pairWith[selectedColor]` (not a flat list of all colors).
5. Cart: treat `quantity` as packs when `unitsPerPack != null`; display `packPrice` and optional `breakdown`.
6. Do not send `size` for pack / pair modes; do not send locked axis for `locked_axis`.
