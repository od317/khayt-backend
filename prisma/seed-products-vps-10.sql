-- 10 demo products for VPS browse/detail.
-- Fixed ids prod-vps-01 … prod-vps-10. Safe to re-run: ON CONFLICT DO NOTHING.
-- Optional supplier = first workshop Business if any exists.
-- Includes Supply rows (inWarehouse) and a couple of saleRule (locked color) products.

WITH imgs AS (
  SELECT ARRAY[
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQNO36XKY6a7gCZq0CK5bQrqrMjc-VhMWm9QQVwp4TNoQ&s=10',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTa1QmlzxwBlPlhmh6w8BM8dXFL2S3ZP4bguvtm95gAPA&s=10',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQhR3LHcBAtCvq4XSONggJ4YkLOAKw__X9FhcNn2Ub_vw&s=10',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQAN_ZqGHFHlICnFwCJjRicONciTe4mqpEBMskNq8cxiA&s=10',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQrOR8d4UkHfokUTnYTV-otgB3EeTggqTLDygpiUoQsWA&s=10',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRNCylkV5skeNMNpCQhX-961pGYzfUSBZtRmvoSIB415Q&s=10',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSY7qvAGoDTbUQsKMssRSOLZSVyYaG4m_udZGcvP6gPhg&s=10',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSO0Hh_Rjs7z4Soe4g6CpLP2Cc2kAIDLTsuEQe58n2SDg&s=10',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSRJv_Mx0w3DSyEB9v_92JFXljfRYIyk5osskJ7sNmBog&s=10'
  ]::text[] AS urls
),
supplier AS (
  SELECT id
  FROM "Business"
  WHERE type = 'workshop'
  ORDER BY "createdAt"
  LIMIT 1
),
defs AS (
  SELECT * FROM (VALUES
    (1,  'قميص أبيض رجالي',     'قمصان',  'قميص قطن 100% — عرض تجريبي',           45000, true,  true),
    (2,  'قميص كاكي',           'قمصان',  'قميص كاكي عملي — عرض تجريبي',          40000, false, true),
    (3,  'بنطال جينز',          'بنطال',  'جينز رجالي — عرض تجريبي',               65000, true,  true),
    (4,  'جاكيت شتوي',          'جاكيتات','جاكيت مبطن — عرض تجريبي',               120000,false, true),
    (5,  'تيشيرت صيفي',         'تيشيرت','تيشيرت قطن خفيف — عرض تجريبي',          25000, true,  true),
    (6,  'قميص رسمي أسود',     'قمصان',  'قميص رسمي للعمل — عرض تجريبي',         47000, true,  true),
    (7,  'قميص كاروهات',        'قمصان',  'كاروهات كلاسيك — عرض تجريبي',           42000, false, true),
    (8,  'بنطال قماش',          'بنطال',  'بنطال قماش أنيق — عرض تجريبي',          55000, true,  true),
    (9,  'طقم ألوان كامل',      'قمصان',  'يُباع كطقم ألوان (saleRule) — تجريبي',  99000, true,  true),
    (10, 'طقم قياسات كامل',     'قمصان',  'يُباع كطقم قياسات (saleRule) — تجريبي', 89000, true,  true)
  ) AS t(n, name, category, description, price, guarantee, in_warehouse)
)
INSERT INTO "Product" (
  id,
  name,
  category,
  description,
  images,
  unit,
  price,
  "inWarehouse",
  available,
  guarantee,
  "supplierBusinessId",
  variants,
  packaging,
  discount,
  offer,
  "saleRule",
  "createdAt",
  "updatedAt"
)
SELECT
  'prod-vps-' || lpad(d.n::text, 2, '0'),
  d.name,
  d.category,
  d.description,
  ARRAY[
    (SELECT urls[((d.n - 1) % 9) + 1] FROM imgs),
    (SELECT urls[(d.n % 9) + 1] FROM imgs)
  ],
  'قطعة',
  d.price,
  d.in_warehouse,
  true,
  d.guarantee,
  (SELECT id FROM supplier),
  jsonb_build_object(
    'axes', jsonb_build_array(
      jsonb_build_object('key', 'color', 'label', 'لون'),
      jsonb_build_object('key', 'size', 'label', 'قياس')
    ),
    'options', jsonb_build_array(
      jsonb_build_object(
        'name', 'أحمر',
        'hex', '#DC2626',
        'image', (SELECT urls[1] FROM imgs),
        'images', jsonb_build_array((SELECT urls[1] FROM imgs)),
        'children', jsonb_build_array(
          jsonb_build_object('name', 'M', 'image', (SELECT urls[1] FROM imgs)),
          jsonb_build_object('name', 'L', 'image', (SELECT urls[1] FROM imgs)),
          jsonb_build_object('name', 'XL', 'image', (SELECT urls[1] FROM imgs))
        )
      ),
      jsonb_build_object(
        'name', 'أزرق',
        'hex', '#2563EB',
        'image', (SELECT urls[2] FROM imgs),
        'images', jsonb_build_array((SELECT urls[2] FROM imgs)),
        'children', jsonb_build_array(
          jsonb_build_object('name', 'M', 'image', (SELECT urls[2] FROM imgs)),
          jsonb_build_object('name', 'L', 'image', (SELECT urls[2] FROM imgs)),
          jsonb_build_object('name', 'XL', 'image', (SELECT urls[2] FROM imgs))
        )
      ),
      jsonb_build_object(
        'name', 'أسود',
        'hex', '#111827',
        'image', (SELECT urls[3] FROM imgs),
        'images', jsonb_build_array((SELECT urls[3] FROM imgs), (SELECT urls[4] FROM imgs)),
        'children', jsonb_build_array(
          jsonb_build_object('name', 'M', 'image', (SELECT urls[3] FROM imgs)),
          jsonb_build_object('name', 'L', 'image', (SELECT urls[3] FROM imgs)),
          jsonb_build_object('name', 'XL', 'image', (SELECT urls[3] FROM imgs))
        )
      )
    )
  ),
  CASE
    WHEN d.n IN (1, 5) THEN '{"onlyPackage": false, "unitsPerPackage": 10, "label": "علبة 10"}'::jsonb
    ELSE NULL
  END,
  CASE
    WHEN d.n = 1 THEN '{"percent": 10, "originalPrice": 50000}'::jsonb
    ELSE NULL
  END,
  CASE
    WHEN d.n = 1 THEN 'عرض خاص'
    ELSE NULL
  END,
  CASE
    WHEN d.n = 9 THEN '{"lockedAxis": "color"}'::jsonb
    WHEN d.n = 10 THEN '{"lockedAxis": "size"}'::jsonb
    ELSE NULL
  END,
  NOW() - ((d.n || ' hours')::interval),
  NOW()
FROM defs d
ON CONFLICT (id) DO NOTHING;

-- Supply for warehouse products
INSERT INTO "Supply" (id, "productId", sent, remaining, "unitPrice", "updatedAt")
SELECT
  'supply-vps-' || lpad(n::text, 2, '0'),
  'prod-vps-' || lpad(n::text, 2, '0'),
  100 + n * 10,
  50 + n * 5,
  GREATEST(20000, (SELECT price FROM "Product" WHERE id = 'prod-vps-' || lpad(n::text, 2, '0')) - 8000),
  NOW()
FROM generate_series(1, 10) AS n
WHERE EXISTS (
  SELECT 1 FROM "Product" p
  WHERE p.id = 'prod-vps-' || lpad(n::text, 2, '0')
    AND p."inWarehouse" = true
)
ON CONFLICT ("productId") DO NOTHING;

-- Summary
SELECT id, name, category, price, "inWarehouse", guarantee,
       "saleRule" IS NOT NULL AS has_sale_rule
FROM "Product"
WHERE id LIKE 'prod-vps-%'
ORDER BY id;
