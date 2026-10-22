-- Seed reels for the demo user ending in 711 (+963992966711).
-- Uses the same sample video/thumbnail URLs as prisma/seed.ts.
-- Safe to re-run: fixed ids, ON CONFLICT DO NOTHING.

WITH author AS (
  SELECT
    u.id AS "authorId",
    COALESCE(l.name, 'دمشق') AS location,
    b.id AS "businessId"
  FROM "User" u
  LEFT JOIN "Location" l ON l.id = u."locationId"
  LEFT JOIN "Business" b ON b."ownerId" = u.id
  WHERE u.phone = '+963992966711'
  LIMIT 1
),
defs AS (
  SELECT * FROM (VALUES
    (
      'post-demo-711-reel-1',
      'تشكيلة صيفية جديدة',
      'جولة سريعة في التشكيلة — ريل تجريبي',
      'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      'https://picsum.photos/id/10/600/800'
    ),
    (
      'post-demo-711-reel-2',
      'من داخل المشغل',
      'لقطات من خط الإنتاج — ريل تجريبي',
      'https://www.w3schools.com/html/mov_bbb.mp4',
      'https://picsum.photos/id/11/600/800'
    ),
    (
      'post-demo-711-reel-3',
      'قماش وألوان',
      'عرض سريع للأقمشة — ريل تجريبي',
      'https://res.cloudinary.com/demo/video/upload/dog.mp4',
      'https://picsum.photos/id/12/600/800'
    )
  ) AS t(id, title, body, "videoUrl", "thumbnailUrl")
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
  "videoUrl",
  "thumbnailUrl",
  location,
  active,
  "workType",
  skills,
  "createdAt",
  "updatedAt"
)
SELECT
  d.id,
  a."authorId",
  a."businessId",
  'reel'::"PostType",
  d.title,
  d.body,
  'video'::"MediaType",
  ARRAY[]::text[],
  d."videoUrl",
  d."thumbnailUrl",
  a.location,
  true,
  ARRAY[]::text[],
  ARRAY[]::text[],
  NOW() - (ROW_NUMBER() OVER (ORDER BY d.id) || ' hours')::interval,
  NOW()
FROM defs d
CROSS JOIN author a
ON CONFLICT (id) DO NOTHING;

SELECT u.phone, p.id, p.title, p.type, p."videoUrl" IS NOT NULL AS has_video
FROM "User" u
JOIN "Post" p ON p."authorId" = u.id
WHERE u.phone = '+963992966711'
  AND p.type = 'reel'
ORDER BY p.id;
