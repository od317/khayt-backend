-- Demo products: one example per FE saleCase (fixed ids).
--
-- KEEP ONLY:
--   prod-sale-free  — free
--   prod-sale-mixed — mixed (per-color free vs sizePack)
--   prod-sale-pair  — color_pair_pack (first color → list of seconds; pairColor required)
--
-- Soft-delete every other demo sample (old sale demos + prod-vps-* + prod-sale-pack).

UPDATE "Product"
SET
  available = false,
  "deletedAt" = COALESCE("deletedAt", NOW()),
  "updatedAt" = NOW()
WHERE "deletedAt" IS NULL
  AND (
    id LIKE 'prod-vps-%'
    OR id = 'prod-sale-pack'
    OR (
      id LIKE 'prod-sale-%'
      AND id NOT IN (
        'prod-sale-free',
        'prod-sale-mixed',
        'prod-sale-pair'
      )
    )
  );

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
    'بعد اختيار اللون الأول تظهر قائمة ألوان ثانية (اختيار إلزامي)',
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
        'أحمر', jsonb_build_array('أزرق', 'أسود'),
        'أزرق', jsonb_build_array('أحمر', 'أسود'),
        'أسود', jsonb_build_array('أحمر', 'أزرق')
      )
    )
  )
) AS v(id, name, description, variants, sale_rule)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  images = EXCLUDED.images,
  unit = EXCLUDED.unit,
  price = EXCLUDED.price,
  "inWarehouse" = EXCLUDED."inWarehouse",
  available = EXCLUDED.available,
  guarantee = EXCLUDED.guarantee,
  "supplierBusinessId" = COALESCE(EXCLUDED."supplierBusinessId", "Product"."supplierBusinessId"),
  variants = EXCLUDED.variants,
  "saleRule" = EXCLUDED."saleRule",
  "deletedAt" = NULL,
  "updatedAt" = NOW();

-- Re-apply full variants for free/mixed/pack/pair (images from existing product rows).
UPDATE "Product" p
SET
  variants = jsonb_build_object(
    'axes', jsonb_build_array(
      jsonb_build_object('key', 'color', 'label', 'لون'),
      jsonb_build_object('key', 'size', 'label', 'قياس')
    ),
    'options', CASE p.id
      WHEN 'prod-sale-mixed' THEN jsonb_build_array(
        jsonb_build_object(
          'name', 'أحمر', 'hex', '#DC2626', 'discountPercent', 10,
          'image', p.images[1], 'images', jsonb_build_array(p.images[1]),
          'children', jsonb_build_array(
            jsonb_build_object('name', 'M', 'image', p.images[1]),
            jsonb_build_object('name', 'L', 'image', p.images[1]),
            jsonb_build_object('name', 'XL', 'image', p.images[1])
          )
        ),
        jsonb_build_object(
          'name', 'أزرق', 'hex', '#2563EB',
          'image', COALESCE(p.images[2], p.images[1]),
          'images', jsonb_build_array(COALESCE(p.images[2], p.images[1])),
          'children', jsonb_build_array(
            jsonb_build_object('name', 'M', 'image', COALESCE(p.images[2], p.images[1])),
            jsonb_build_object('name', 'L', 'image', COALESCE(p.images[2], p.images[1])),
            jsonb_build_object('name', 'XL', 'image', COALESCE(p.images[2], p.images[1]))
          )
        ),
        jsonb_build_object(
          'name', 'أسود', 'hex', '#111827',
          'image', COALESCE(p.images[1], p.images[1]),
          'images', jsonb_build_array(COALESCE(p.images[1], p.images[1])),
          'sizePack', jsonb_build_object(
            'sizes', jsonb_build_array('M', 'L', 'XL'),
            'qtyPerSize', 1
          ),
          'children', jsonb_build_array(
            jsonb_build_object('name', 'M', 'image', COALESCE(p.images[1], p.images[1])),
            jsonb_build_object('name', 'L', 'image', COALESCE(p.images[1], p.images[1])),
            jsonb_build_object('name', 'XL', 'image', COALESCE(p.images[1], p.images[1]))
          )
        )
      )
      WHEN 'prod-sale-free' THEN jsonb_build_array(
        jsonb_build_object(
          'name', 'أحمر', 'hex', '#DC2626', 'discountPercent', 10,
          'image', p.images[1], 'images', jsonb_build_array(p.images[1]),
          'children', jsonb_build_array(
            jsonb_build_object('name', 'M', 'image', p.images[1]),
            jsonb_build_object('name', 'L', 'image', p.images[1]),
            jsonb_build_object('name', 'XL', 'image', p.images[1])
          )
        ),
        jsonb_build_object(
          'name', 'أزرق', 'hex', '#2563EB',
          'image', COALESCE(p.images[2], p.images[1]),
          'images', jsonb_build_array(COALESCE(p.images[2], p.images[1])),
          'children', jsonb_build_array(
            jsonb_build_object('name', 'M', 'image', COALESCE(p.images[2], p.images[1])),
            jsonb_build_object('name', 'L', 'image', COALESCE(p.images[2], p.images[1])),
            jsonb_build_object('name', 'XL', 'image', COALESCE(p.images[2], p.images[1]))
          )
        ),
        jsonb_build_object(
          'name', 'أسود', 'hex', '#111827',
          'image', COALESCE(p.images[1], p.images[1]),
          'images', jsonb_build_array(COALESCE(p.images[1], p.images[1])),
          'children', jsonb_build_array(
            jsonb_build_object('name', 'M', 'image', COALESCE(p.images[1], p.images[1])),
            jsonb_build_object('name', 'L', 'image', COALESCE(p.images[1], p.images[1])),
            jsonb_build_object('name', 'XL', 'image', COALESCE(p.images[1], p.images[1]))
          )
        )
      )
      ELSE jsonb_build_array(
        jsonb_build_object(
          'name', 'أحمر', 'hex', '#DC2626',
          'image', p.images[1], 'images', jsonb_build_array(p.images[1]),
          'children', jsonb_build_array(
            jsonb_build_object('name', 'M', 'image', p.images[1]),
            jsonb_build_object('name', 'L', 'image', p.images[1]),
            jsonb_build_object('name', 'XL', 'image', p.images[1])
          )
        ),
        jsonb_build_object(
          'name', 'أزرق', 'hex', '#2563EB',
          'image', COALESCE(p.images[2], p.images[1]),
          'images', jsonb_build_array(COALESCE(p.images[2], p.images[1])),
          'children', jsonb_build_array(
            jsonb_build_object('name', 'M', 'image', COALESCE(p.images[2], p.images[1])),
            jsonb_build_object('name', 'L', 'image', COALESCE(p.images[2], p.images[1])),
            jsonb_build_object('name', 'XL', 'image', COALESCE(p.images[2], p.images[1]))
          )
        ),
        jsonb_build_object(
          'name', 'أسود', 'hex', '#111827',
          'image', COALESCE(p.images[1], p.images[1]),
          'images', jsonb_build_array(COALESCE(p.images[1], p.images[1])),
          'children', jsonb_build_array(
            jsonb_build_object('name', 'M', 'image', COALESCE(p.images[1], p.images[1])),
            jsonb_build_object('name', 'L', 'image', COALESCE(p.images[1], p.images[1])),
            jsonb_build_object('name', 'XL', 'image', COALESCE(p.images[1], p.images[1]))
          )
        )
      )
    END
  ),
  "updatedAt" = NOW()
WHERE p.id IN (
  'prod-sale-free',
  'prod-sale-mixed',
  'prod-sale-pair'
);

INSERT INTO "Supply" (id, "productId", sent, remaining, "unitPrice", "updatedAt")
SELECT 'supply-' || id, id, 200, 120, 37000, NOW()
FROM (VALUES
  ('prod-sale-free'),
  ('prod-sale-mixed'),
  ('prod-sale-pair')
) AS t(id)
WHERE EXISTS (SELECT 1 FROM "Product" p WHERE p.id = t.id)
ON CONFLICT ("productId") DO NOTHING;

SELECT id, name, COALESCE("saleRule"->>'mode', 'per-color / free') AS mode
FROM "Product"
WHERE id IN (
  'prod-sale-free',
  'prod-sale-mixed',
  'prod-sale-pair'
)
ORDER BY id;
