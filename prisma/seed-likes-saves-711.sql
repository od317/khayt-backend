-- 30 likes + 30 saves for demo user +963992966711.
-- Creates 30 engagement-target posts (authored by 712) if missing, then
-- likes and saves all of them for 711.
-- Safe to re-run: fixed ids, ON CONFLICT DO NOTHING.

-- 1) Target posts (author = 712 so 711 is not liking own posts)
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
author AS (
  SELECT
    u.id AS "authorId",
    COALESCE(l.name, 'دمشق') AS location,
    b.id AS "businessId"
  FROM "User" u
  LEFT JOIN "Location" l ON l.id = u."locationId"
  LEFT JOIN "Business" b ON b."ownerId" = u.id
  WHERE u.phone <> '+963992966711'
  ORDER BY
    CASE WHEN u.phone = '+963992966712' THEN 0 ELSE 1 END,
    u.phone
  LIMIT 1
),
nums AS (
  SELECT generate_series(1, 30) AS n
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
  'post-eng-711-' || lpad(n.n::text, 2, '0'),
  a."authorId",
  a."businessId",
  'product_offering'::"PostType",
  'منشور تفاعلي ' || n.n,
  'منشور لتغذية الإعجابات والمحفوظات لمستخدم 711 — #' || n.n,
  'image'::"MediaType",
  ARRAY[
    (SELECT urls[((n.n - 1) % 9) + 1] FROM imgs),
    (SELECT urls[((n.n) % 9) + 1] FROM imgs)
  ],
  a.location,
  true,
  'ألبسة رجالية',
  'جملة',
  'سعر ثابت',
  (20000 + n.n * 1000)::text,
  ARRAY[]::text[],
  ARRAY[]::text[],
  NOW() - ((n.n || ' hours')::interval),
  NOW()
FROM nums n
CROSS JOIN author a
ON CONFLICT (id) DO NOTHING;

-- 2) 30 likes for 711
WITH me AS (
  SELECT id AS "userId"
  FROM "User"
  WHERE phone = '+963992966711'
  LIMIT 1
),
targets AS (
  SELECT generate_series(1, 30) AS n
)
INSERT INTO "Like" ("userId", "postId", "createdAt")
SELECT
  me."userId",
  'post-eng-711-' || lpad(t.n::text, 2, '0'),
  NOW() - ((t.n || ' minutes')::interval)
FROM me
CROSS JOIN targets t
JOIN "Post" p ON p.id = 'post-eng-711-' || lpad(t.n::text, 2, '0')
ON CONFLICT ("userId", "postId") DO NOTHING;

-- 3) 30 saves for 711
WITH me AS (
  SELECT id AS "userId"
  FROM "User"
  WHERE phone = '+963992966711'
  LIMIT 1
),
targets AS (
  SELECT generate_series(1, 30) AS n
)
INSERT INTO "SavedPost" ("userId", "postId", "createdAt")
SELECT
  me."userId",
  'post-eng-711-' || lpad(t.n::text, 2, '0'),
  NOW() - ((t.n || ' minutes')::interval)
FROM me
CROSS JOIN targets t
JOIN "Post" p ON p.id = 'post-eng-711-' || lpad(t.n::text, 2, '0')
ON CONFLICT ("userId", "postId") DO NOTHING;

-- Summary
SELECT
  u.phone,
  (SELECT COUNT(*) FROM "Like" l WHERE l."userId" = u.id) AS likes,
  (SELECT COUNT(*) FROM "SavedPost" s WHERE s."userId" = u.id) AS saves
FROM "User" u
WHERE u.phone = '+963992966711';
