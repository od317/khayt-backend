-- Demo products for sale / cart cases (fixed ids, ON CONFLICT DO NOTHING).
--
-- prod-sale-free   — free color+size; أحمر 10% discount
-- prod-sale-mixed  — أحمر free+discount, أسود admin sizePack (same product)
-- prod-sale-pair   — saleRule color_pair_pack (pairWith: second color = أسود only)
-- prod-sale-locked — saleRule locked_axis (color)

WITH imgs AS (
  SELECT ARRAY[
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQNO36XKY6a7gCZq0CK5bQrqrMjc-VhMWm9QQVwp4TNoQ&s=10',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTa1QmlzxwBlPlhmh6w8BM8dXFL2S3ZP4bguvtm95gAPA&s=10',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQhR3LHcBAtCvq4XSONggJ4YkLOAKw__X9FhcNn2Ub_vw&s=10'
  ]::text[] AS urls
),
supplier AS (
  SELECT id FROM "Business" WHERE type = 'workshop' ORDER BY "createdAt" LIMIT 1
),
built AS (
  SELECT
    (SELECT urls[1] FROM imgs) AS u1,
    (SELECT urls[2] FROM imgs) AS u2,
    (SELECT urls[3] FROM imgs) AS u3,
    (SELECT id FROM supplier) AS supplier_id
)
INSERT INTO "Product" (
  id, name, category, description, images, unit, price,
  "inWarehouse", available, guarantee, "supplierBusinessId",
  variants, packaging, discount, offer, "saleRule",
  "createdAt", "updatedAt"
)
SELECT
  v.id, v.name, 'قمصان', v.description,
  ARRAY[b.u1, b.u2],
  'قطعة', 45000, true, true, true, b.supplier_id,
  v.variants, NULL, NULL, NULL, v.sale_rule,
  NOW(), NOW()
FROM built b
CROSS JOIN LATERAL (
  VALUES
  (
    'prod-sale-free',
    'قميص اختيار حر',
    'ألوان حرة + خصم على الأحمر',
    jsonb_build_object(
      'axes', jsonb_build_array(
        jsonb_build_object('key', 'color', 'label', 'لون'),
        jsonb_build_object('key', 'size', 'label', 'قياس')
      ),
      'options', jsonb_build_array(
        jsonb_build_object(
          'name', 'أحمر', 'hex', '#DC2626', 'discountPercent', 10,
          'image', b.u1, 'images', jsonb_build_array(b.u1),
          'children', jsonb_build_array(
            jsonb_build_object('name', 'M', 'image', b.u1),
            jsonb_build_object('name', 'L', 'image', b.u1),
            jsonb_build_object('name', 'XL', 'image', b.u1)
          )
        ),
        jsonb_build_object(
          'name', 'أزرق', 'hex', '#2563EB',
          'image', b.u2, 'images', jsonb_build_array(b.u2),
          'children', jsonb_build_array(
            jsonb_build_object('name', 'M', 'image', b.u2),
            jsonb_build_object('name', 'L', 'image', b.u2),
            jsonb_build_object('name', 'XL', 'image', b.u2)
          )
        ),
        jsonb_build_object(
          'name', 'أسود', 'hex', '#111827',
          'image', b.u3, 'images', jsonb_build_array(b.u3),
          'children', jsonb_build_array(
            jsonb_build_object('name', 'M', 'image', b.u3),
            jsonb_build_object('name', 'L', 'image', b.u3),
            jsonb_build_object('name', 'XL', 'image', b.u3)
          )
        )
      )
    ),
    NULL::jsonb
  ),
  (
    'prod-sale-mixed',
    'قميص مختلط الألوان',
    'أحمر حر+خصم، أسود طقم قياسات إداري',
    jsonb_build_object(
      'axes', jsonb_build_array(
        jsonb_build_object('key', 'color', 'label', 'لون'),
        jsonb_build_object('key', 'size', 'label', 'قياس')
      ),
      'options', jsonb_build_array(
        jsonb_build_object(
          'name', 'أحمر', 'hex', '#DC2626', 'discountPercent', 10,
          'image', b.u1, 'images', jsonb_build_array(b.u1),
          'children', jsonb_build_array(
            jsonb_build_object('name', 'M', 'image', b.u1),
            jsonb_build_object('name', 'L', 'image', b.u1),
            jsonb_build_object('name', 'XL', 'image', b.u1)
          )
        ),
        jsonb_build_object(
          'name', 'أزرق', 'hex', '#2563EB',
          'image', b.u2, 'images', jsonb_build_array(b.u2),
          'children', jsonb_build_array(
            jsonb_build_object('name', 'M', 'image', b.u2),
            jsonb_build_object('name', 'L', 'image', b.u2),
            jsonb_build_object('name', 'XL', 'image', b.u2)
          )
        ),
        jsonb_build_object(
          'name', 'أسود', 'hex', '#111827',
          'image', b.u3, 'images', jsonb_build_array(b.u3),
          'sizePack', jsonb_build_object(
            'sizes', jsonb_build_array('M', 'L', 'XL'),
            'qtyPerSize', 1
          ),
          'children', jsonb_build_array(
            jsonb_build_object('name', 'M', 'image', b.u3),
            jsonb_build_object('name', 'L', 'image', b.u3),
            jsonb_build_object('name', 'XL', 'image', b.u3)
          )
        )
      )
    ),
    NULL::jsonb
  ),
  (
    'prod-sale-pair',
    'طقم لونين',
    'لون + لون اقتران بقياسات إدارية',
    jsonb_build_object(
      'axes', jsonb_build_array(
        jsonb_build_object('key', 'color', 'label', 'لون'),
        jsonb_build_object('key', 'size', 'label', 'قياس')
      ),
      'options', jsonb_build_array(
        jsonb_build_object(
          'name', 'أحمر', 'hex', '#DC2626',
          'image', b.u1, 'images', jsonb_build_array(b.u1),
          'children', jsonb_build_array(
            jsonb_build_object('name', 'M', 'image', b.u1),
            jsonb_build_object('name', 'L', 'image', b.u1),
            jsonb_build_object('name', 'XL', 'image', b.u1)
          )
        ),
        jsonb_build_object(
          'name', 'أزرق', 'hex', '#2563EB',
          'image', b.u2, 'images', jsonb_build_array(b.u2),
          'children', jsonb_build_array(
            jsonb_build_object('name', 'M', 'image', b.u2),
            jsonb_build_object('name', 'L', 'image', b.u2),
            jsonb_build_object('name', 'XL', 'image', b.u2)
          )
        ),
        jsonb_build_object(
          'name', 'أسود', 'hex', '#111827',
          'image', b.u3, 'images', jsonb_build_array(b.u3),
          'children', jsonb_build_array(
            jsonb_build_object('name', 'M', 'image', b.u3),
            jsonb_build_object('name', 'L', 'image', b.u3),
            jsonb_build_object('name', 'XL', 'image', b.u3)
          )
        )
      )
    ),
    jsonb_build_object(
      'mode', 'color_pair_pack',
      'sizePack', jsonb_build_object(
        'sizes', jsonb_build_array('M', 'L', 'XL'),
        'qtyPerSize', 5
      ),
      'pairWith', jsonb_build_object(
        'أحمر', jsonb_build_array('أسود'),
        'أزرق', jsonb_build_array('أسود')
      )
    )
  ),
  (
    'prod-sale-locked',
    'طقم ألوان كامل',
    'كل الألوان معاً — اختر القياس فقط',
    jsonb_build_object(
      'axes', jsonb_build_array(
        jsonb_build_object('key', 'color', 'label', 'لون'),
        jsonb_build_object('key', 'size', 'label', 'قياس')
      ),
      'options', jsonb_build_array(
        jsonb_build_object(
          'name', 'أحمر', 'hex', '#DC2626',
          'image', b.u1, 'images', jsonb_build_array(b.u1),
          'children', jsonb_build_array(
            jsonb_build_object('name', 'M', 'image', b.u1),
            jsonb_build_object('name', 'L', 'image', b.u1),
            jsonb_build_object('name', 'XL', 'image', b.u1)
          )
        ),
        jsonb_build_object(
          'name', 'أزرق', 'hex', '#2563EB',
          'image', b.u2, 'images', jsonb_build_array(b.u2),
          'children', jsonb_build_array(
            jsonb_build_object('name', 'M', 'image', b.u2),
            jsonb_build_object('name', 'L', 'image', b.u2),
            jsonb_build_object('name', 'XL', 'image', b.u2)
          )
        ),
        jsonb_build_object(
          'name', 'أسود', 'hex', '#111827',
          'image', b.u3, 'images', jsonb_build_array(b.u3),
          'children', jsonb_build_array(
            jsonb_build_object('name', 'M', 'image', b.u3),
            jsonb_build_object('name', 'L', 'image', b.u3),
            jsonb_build_object('name', 'XL', 'image', b.u3)
          )
        )
      )
    ),
    jsonb_build_object('mode', 'locked_axis', 'lockedAxis', 'color')
  )
) AS v(id, name, description, variants, sale_rule)
ON CONFLICT (id) DO NOTHING;

-- Refresh pair demo so re-runs pick up pairWith (second color = أسود only).
UPDATE "Product"
SET
  "saleRule" = jsonb_build_object(
    'mode', 'color_pair_pack',
    'sizePack', jsonb_build_object(
      'sizes', jsonb_build_array('M', 'L', 'XL'),
      'qtyPerSize', 5
    ),
    'pairWith', jsonb_build_object(
      'أحمر', jsonb_build_array('أسود'),
      'أزرق', jsonb_build_array('أسود')
    )
  ),
  "updatedAt" = NOW()
WHERE id = 'prod-sale-pair';

INSERT INTO "Supply" (id, "productId", sent, remaining, "unitPrice", "updatedAt")
SELECT 'supply-' || id, id, 200, 120, 37000, NOW()
FROM (VALUES
  ('prod-sale-free'),
  ('prod-sale-mixed'),
  ('prod-sale-pair'),
  ('prod-sale-locked')
) AS t(id)
WHERE EXISTS (SELECT 1 FROM "Product" p WHERE p.id = t.id)
ON CONFLICT ("productId") DO NOTHING;

SELECT id, name, COALESCE("saleRule"->>'mode', 'per-color / free') AS mode
FROM "Product"
WHERE id LIKE 'prod-sale-%'
ORDER BY id;
