# Sale / cart UI cases (FE contract)

Demo product ids (after `prisma/seed-sale-modes-demo.sql`):

| id | `saleCase` | UI |
|----|------------|-----|
| `prod-sale-free` | `free` | Pick color + size; optional color discount |
| `prod-sale-mixed` | `mixed` | Some colors free size, some admin pack |
| `prod-sale-pack` | `color_size_pack` | Pick color only; sizes shown disabled (admin pack) |
| `prod-sale-pair` | `color_pair_pack` | First color → **list** of seconds; **pairColor required** |

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
| `color_pair_pack` | `{ color, pairColor }` **or** `{ color, pairColors: [...] }` — first + at least one second | packs | `product.packPrice` / `saleRule.packPrice`; seconds from `saleRule.pairWith[color]`; one cart line per second color |

### Size chips UX (important)

**Never hide the size row.** When the buyer cannot pick a size, keep the size chips visible but **disabled**, and show the sizes the admin configured for that pack/set.

| Situation | Size UI |
|-----------|---------|
| `free` / mixed free color | Enabled — buyer selects one size |
| mixed pack color (`sizeMode: "pack"`) | Disabled — show `colorImages[].sizePack.sizes` (and qty via `qtyPerSize` / `unitsPerPack`) |
| `color_size_pack` / `color_pair_pack` | Disabled — show `saleRule.sizePack.sizes` |

Cart payload still omits `size` when sizes are admin-forced (disabled chips are display-only).

**New fields (this release):**

- `product.packPrice` — product-wide set price; `null` for free/mixed
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

- أحمر / أزرق: `sizeMode: "free"` → size chips **enabled**; buyer picks one; discount on أحمر
- أسود: `sizeMode: "pack"` → size chips stay visible but **disabled**, showing admin pack sizes (`M`, `L`, `XL`); qty = packs; show `packPrice`

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

# Case 3 — `color_size_pack` (`prod-sale-pack`)

**Flow:** pick color only. Size chips stay visible but **disabled**, showing `saleRule.sizePack.sizes` (`M`, `L`, `XL`). Qty = packs. `packPrice` = 45000 × 3 = 135000.

### Product (key fields)

```http
GET /api/products/prod-sale-pack
```

```json
{
  "product": {
    "id": "prod-sale-pack",
    "name": "طقم قياسات بلون",
    "description": "اختر اللون فقط — القياسات إدارية (طقم)",
    "price": 45000,
    "saleCase": "color_size_pack",
    "packPrice": 135000,
    "saleRule": {
      "mode": "color_size_pack",
      "sizePack": { "sizes": ["M", "L", "XL"], "qtyPerSize": 1 },
      "unitsPerPack": 3,
      "packPrice": 135000
    }
  },
  "availableQuantity": 120
}
```

Drive UI from **`saleCase`**. `colorImages[].sizeMode` may stay `"free"`; sizes come from `saleRule.sizePack`.

### Add to cart

```json
{
  "productId": "prod-sale-pack",
  "quantity": 2,
  "variant": { "color": "أحمر" }
}
```

```json
{
  "id": "c5555555-5555-5555-5555-555555555555",
  "quantity": 2,
  "unitsPerPack": 3,
  "totalPieces": 6,
  "breakdown": [
    { "color": "أحمر", "size": "M", "qty": 2 },
    { "color": "أحمر", "size": "L", "qty": 2 },
    { "color": "أحمر", "size": "XL", "qty": 2 }
  ],
  "originalUnitPrice": 45000,
  "unitPrice": 45000,
  "packPrice": 135000,
  "variant": { "color": "أحمر" },
  "variantKey": "color:أحمر",
  "product": {
    "id": "prod-sale-pack",
    "name": "طقم قياسات بلون",
    "price": 45000,
    "unit": "قطعة",
    "images": ["IMG1", "IMG2"],
    "available": true,
    "inWarehouse": true,
    "guarantee": true,
    "variantImage": "IMG1"
  },
  "lineTotal": 270000,
  "available": true,
  "unavailableReason": null
}
```

Rejected: sending `size` or `pairColor`.

### Checkout expand

Three order lines: أحمر/M×2, أحمر/L×2, أحمر/XL×2.

---

# Case 4 — `color_pair_pack` (`prod-sale-pair`)

**Flow:**

1. Pick first color.
2. Second-color list from `saleRule.pairWith[first]` (e.g. أحمر → أزرق, أسود).
3. Pick **one or more** seconds — required (`pairColor` or `pairColors[]`). Add stays disabled until at least one second is set.
4. Size chips visible but **disabled** (`saleRule.sizePack`: M/L/XL × 5).
5. Show `packPrice` per pair (45000 × 30 = 1_350_000). Multi-select → one cart line (one pack price) per second color.

`unitsPerPack` = 3 × 5 × 2 = 30.

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
    "description": "بعد اختيار اللون الأول تظهر قائمة ألوان ثانية (اختيار إلزامي)",
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
        "أحمر": ["أزرق", "أسود"],
        "أزرق": ["أحمر", "أسود"],
        "أسود": ["أحمر", "أزرق"]
      },
      "allowedPairColors": ["أزرق", "أسود", "أحمر"],
      "unitsPerPack": 30,
      "packPrice": 1350000
    },
    "createdAt": "2026-10-22T07:00:00.000Z"
  },
  "availableQuantity": 120
}
```

### Add to cart — one second color

```http
POST /api/cart/items
```

```json
{
  "productId": "prod-sale-pair",
  "quantity": 1,
  "variant": { "color": "أحمر", "pairColor": "أزرق" }
}
```

```json
{
  "items": [
    {
      "id": "c3333333-3333-3333-3333-333333333333",
      "quantity": 1,
      "unitsPerPack": 30,
      "totalPieces": 30,
      "breakdown": [
        { "color": "أحمر", "size": "M", "qty": 5 },
        { "color": "أحمر", "size": "L", "qty": 5 },
        { "color": "أحمر", "size": "XL", "qty": 5 },
        { "color": "أزرق", "size": "M", "qty": 5 },
        { "color": "أزرق", "size": "L", "qty": 5 },
        { "color": "أزرق", "size": "XL", "qty": 5 }
      ],
      "originalUnitPrice": 45000,
      "unitPrice": 45000,
      "packPrice": 1350000,
      "variant": { "color": "أحمر", "pairColor": "أزرق" },
      "variantKey": "color:أحمر|pairColor:أزرق",
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
  ]
}
```

### Add to cart — multiple second colors (same request)

```json
{
  "productId": "prod-sale-pair",
  "quantity": 1,
  "variant": { "color": "أحمر", "pairColors": ["أزرق", "أسود"] }
}
```

```json
{
  "items": [
    {
      "id": "…",
      "quantity": 1,
      "unitsPerPack": 30,
      "totalPieces": 30,
      "packPrice": 1350000,
      "variant": { "color": "أحمر", "pairColor": "أزرق" },
      "variantKey": "color:أحمر|pairColor:أزرق",
      "lineTotal": 1350000
    },
    {
      "id": "…",
      "quantity": 1,
      "unitsPerPack": 30,
      "totalPieces": 30,
      "packPrice": 1350000,
      "variant": { "color": "أحمر", "pairColor": "أسود" },
      "variantKey": "color:أحمر|pairColor:أسود",
      "lineTotal": 1350000
    }
  ]
}
```

Singular `pairColor` still works. You may send both; values are merged and de-duplicated.

Rejected (FE should disable Add until valid):

- `{ "color": "أحمر" }` — **missing second color** (`pairColor` / `pairColors`)
- `{ "color": "أحمر", "pairColors": [] }` — empty list
- `{ "color": "أحمر", "pairColor": "وردي" }` — not in `pairWith.أحمر`
- sending `size` — validation error

### Checkout expand

Per cart line: six order lines (each of the two colors × each size × 5). Two seconds → two packs → twelve order lines.


---

## Quick FE checklist

1. Switch screens on `saleCase` (four demos: free / mixed / pack / pair).
2. **Never hide sizes** — when the buyer cannot pick, **disable** the chips and show `sizePack.sizes`.
3. Show strikethrough with `colorImages[].originalPrice` / `.price` when discount.
4. Show set price from `packPrice` (product or per-color).
5. Pair: after first color, show `saleRule.pairWith[selectedColor]` list; second pick is **required**.
6. Cart: treat `quantity` as packs when `unitsPerPack != null`; display `packPrice` and optional `breakdown`.
7. Do not send `size` for pack / pair modes.
