-- Seed sample posts for demo users created on VPS.
-- Phones: +963992966711 … +963992966716
-- Uses the same image URLs as prisma/seed.ts (SEED_POST_IMAGES / fabric set).
-- Safe to re-run: fixed post ids, ON CONFLICT DO NOTHING.

-- Verify users exist first (optional check):
-- SELECT id, phone, role, "onboardingCompleted" FROM "User"
-- WHERE phone LIKE '+96399296671%';

WITH imgs AS (
  SELECT ARRAY[
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRCaEiyENTwM0691yc2BOs5rXyrT5HLnIbfO8Q_S6K5X-y2DbB8kOEnX_I&s=10',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSuBuFVV6vcWrTmYjB0080oLAW0fYaGlu44gB-lymQktFde_5V6RcUQEzZZ&s=10',
    'https://cdnimg.co/ece03e48-a716-411d-bb8e-498840fa15ce/35ed3f6f-0165-4f22-9024-79f323071ed5/how-to-look-good-men-s-fashion-mens-outfit.jpg',
    'https://nousa.nl/cdn/shop/collections/kleding_heren.jpg?v=1764013659',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSNJQLxKPnMO13eOchsA-IrHakV-FwsAxmHvSj6qCZVecUbzOkyCQ_JIgQE&s=10',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS_0xs03FEbqL3bGRMJyAkKIDvgjPWJo27djmhI9u88BA&s=10',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQNO36XKY6a7gCZq0CK5bQrqrMjc-VhMWm9QQVwp4TNoQ&s=10',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTa1QmlzxwBlPlhmh6w8BM8dXFL2S3ZP4bguvtm95gAPA&s=10',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQhR3LHcBAtCvq4XSONggJ4YkLOAKw__X9FhcNn2Ub_vw&s=10'
  ]::text[] AS urls
),
authors AS (
  SELECT
    u.id AS "authorId",
    u.phone,
    COALESCE(l.name, 'دمشق') AS location,
    b.id AS "businessId",
    RIGHT(u.phone, 3) AS suffix
  FROM "User" u
  LEFT JOIN "Location" l ON l.id = u."locationId"
  LEFT JOIN "Business" b ON b."ownerId" = u.id
  WHERE u.phone IN (
    '+963992966711',
    '+963992966712',
    '+963992966713',
    '+963992966714',
    '+963992966715',
    '+963992966716'
  )
),
defs AS (
  -- Two posts per user (image posts)
  SELECT * FROM (VALUES
    -- 711
    ('post-demo-711-a', '711', 'product_offering'::"PostType", 'قمصان قطن للبيع', 'قمصان قطن بجودة عالية — عرض تجريبي', 'ألبسة رجالية', 'جملة', 'سعر ثابت', '45000', ARRAY[0,2]::int[]),
    ('post-demo-711-b', '711', 'service_offering'::"PostType", 'خدمة تطريز', 'تطريز يدوي بجودة عالية — عرض تجريبي', 'تصميم', NULL, NULL, NULL, ARRAY[1,3]::int[]),
    -- 712
    ('post-demo-712-a', '712', 'job_offering'::"PostType", 'مطلوب خياط ماهر', 'نبحث عن خياط للعمل — عرض تجريبي', 'إنتاج/صناعة', NULL, NULL, NULL, ARRAY[2,4]::int[]),
    ('post-demo-712-b', '712', 'material_offering'::"PostType", 'قماش قطن للبيع', 'قماش قطن مصري — عرض تجريبي', 'أقمشة', NULL, NULL, NULL, ARRAY[3,5]::int[]),
    -- 713
    ('post-demo-713-a', '713', 'product_offering'::"PostType", 'بنطال جينز جملة', 'بنطال جينز بمقاسات متعددة — عرض تجريبي', 'ألبسة رجالية', 'جملة', 'سعر ثابت', '65000', ARRAY[4,6]::int[]),
    ('post-demo-713-b', '713', 'job_seeking'::"PostType", 'خياط يبحث عن عمل', 'خبرة في خياطة القمصان — عرض تجريبي', 'إنتاج/صناعة', NULL, NULL, NULL, ARRAY[5,0]::int[]),
    -- 714
    ('post-demo-714-a', '714', 'service_requesting'::"PostType", 'أحتاج خياط', 'أبحث عن خياط لإنهاء طلب — عرض تجريبي', 'خياطة', NULL, NULL, NULL, ARRAY[6,1]::int[]),
    ('post-demo-714-b', '714', 'product_offering'::"PostType", 'ألبسة صيفية', 'تشكيلة صيفية جاهزة — عرض تجريبي', 'ألبسة رجالية', 'مفرق', 'سعر ثابت', '35000', ARRAY[7,2]::int[]),
    -- 715
    ('post-demo-715-a', '715', 'material_requesting'::"PostType", 'أبحث عن قماش كتان', 'أحتاج قماش كتان — عرض تجريبي', 'أقمشة', NULL, NULL, NULL, ARRAY[8,3]::int[]),
    ('post-demo-715-b', '715', 'service_offering'::"PostType", 'قص وتفصيل', 'خدمة قص وتفصيل — عرض تجريبي', 'إنتاج/صناعة', NULL, NULL, NULL, ARRAY[0,4]::int[]),
    -- 716
    ('post-demo-716-a', '716', 'product_offering'::"PostType", 'جاكيت شتوي', 'جاكيتات شتوية للجملة — عرض تجريبي', 'ألبسة رجالية', 'جملة', 'سعر ثابت', '120000', ARRAY[1,5]::int[]),
    ('post-demo-716-b', '716', 'job_offering'::"PostType", 'مطلوب عامل مستودع', 'فرصة عمل في المستودع — عرض تجريبي', 'إدارة', NULL, NULL, NULL, ARRAY[2,6]::int[])
  ) AS t(id, suffix, type, title, body, specialty, "sellMethod", "priceMethod", price, img_idx)
)
INSERT INTO "Post" (
  id,
  "authorId",
  "businessId",
  type,
  title,
  body,
  media,
  "imageUrls",
  location,
  active,
  specialty,
  "sellMethod",
  "priceMethod",
  price,
  "workType",
  skills,
  "createdAt",
  "updatedAt"
)
SELECT
  d.id,
  a."authorId",
  a."businessId",
  d.type,
  d.title,
  d.body,
  'image'::"MediaType",
  ARRAY[
    (SELECT urls[d.img_idx[1] + 1] FROM imgs),
    (SELECT urls[d.img_idx[2] + 1] FROM imgs)
  ],
  a.location,
  true,
  d.specialty,
  d."sellMethod",
  d."priceMethod",
  d.price,
  CASE
    WHEN d.type IN ('job_offering'::"PostType", 'job_seeking'::"PostType")
      THEN ARRAY['كامل']::text[]
    ELSE ARRAY[]::text[]
  END,
  CASE
    WHEN d.type IN ('job_offering'::"PostType", 'job_seeking'::"PostType")
      THEN ARRAY['خياطة']::text[]
    ELSE ARRAY[]::text[]
  END,
  NOW() - ((ROW_NUMBER() OVER (ORDER BY d.id))::int || ' hours')::interval,
  NOW()
FROM defs d
JOIN authors a ON a.suffix = d.suffix
ON CONFLICT (id) DO NOTHING;

-- Summary
SELECT u.phone, u.role, COUNT(p.id) AS posts
FROM "User" u
LEFT JOIN "Post" p ON p."authorId" = u.id AND p.id LIKE 'post-demo-%'
WHERE u.phone IN (
  '+963992966711',
  '+963992966712',
  '+963992966713',
  '+963992966714',
  '+963992966715',
  '+963992966716'
)
GROUP BY u.phone, u.role
ORDER BY u.phone;
