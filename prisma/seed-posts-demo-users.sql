-- Create 15 public demo posts for every active public-role user.
-- Public roles: employee, workshop, institute, store, marketer, shipping_company.
-- Internal roles and suspended users are excluded.
-- All 8 PostType values are cycled through; seeded posts are approved and public.
-- Safe to re-run: deterministic IDs and ON CONFLICT DO NOTHING.

-- Remove records created by the previous version of this seed.
DELETE FROM "Post"
WHERE id IN (
  'post-demo-711-a', 'post-demo-711-b',
  'post-demo-712-a', 'post-demo-712-b',
  'post-demo-713-a', 'post-demo-713-b',
  'post-demo-714-a', 'post-demo-714-b',
  'post-demo-715-a', 'post-demo-715-b',
  'post-demo-716-a', 'post-demo-716-b'
);

WITH public_users AS (
  SELECT
    u.id AS "authorId",
    COALESCE(l.name, 'دمشق') AS location,
    b.id AS "businessId"
  FROM "User" u
  LEFT JOIN "Location" l ON l.id = u."locationId"
  LEFT JOIN "Business" b ON b."ownerId" = u.id
  WHERE u.role IN (
    'employee',
    'workshop',
    'institute',
    'store',
    'marketer',
    'shipping_company'
  )
    AND u.suspended = false
),
post_numbers AS (
  SELECT generate_series(1, 15) AS number
),
posts AS (
  SELECT
    u."authorId",
    u."businessId",
    u.location,
    n.number,
    CASE ((n.number - 1) % 8)
      WHEN 0 THEN 'job_seeking'::"PostType"
      WHEN 1 THEN 'job_offering'::"PostType"
      WHEN 2 THEN 'service_offering'::"PostType"
      WHEN 3 THEN 'service_requesting'::"PostType"
      WHEN 4 THEN 'product_offering'::"PostType"
      WHEN 5 THEN 'material_offering'::"PostType"
      WHEN 6 THEN 'material_requesting'::"PostType"
      ELSE 'reel'::"PostType"
    END AS type
  FROM public_users u
  CROSS JOIN post_numbers n
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
  "approvalStatus",
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
  'demo-post-' || md5(p."authorId") || '-' || lpad(p.number::text, 2, '0'),
  p."authorId",
  p."businessId",
  p.type,
  CASE p.type
    WHEN 'job_seeking' THEN 'خياط يبحث عن فرصة عمل'
    WHEN 'job_offering' THEN 'مطلوب عامل في مجال الألبسة'
    WHEN 'service_offering' THEN 'خدمات خياطة وتفصيل'
    WHEN 'service_requesting' THEN 'أبحث عن خدمة خياطة'
    WHEN 'product_offering' THEN 'منتجات ألبسة للبيع'
    WHEN 'material_offering' THEN 'أقمشة ومواد للبيع'
    WHEN 'material_requesting' THEN 'مطلوب أقمشة ومواد'
    WHEN 'reel' THEN 'فيديو من أعمالنا'
  END || ' - ' || p.number::text,
  CASE p.type
    WHEN 'job_seeking' THEN 'أبحث عن فرصة عمل في مجال الخياطة والألبسة.'
    WHEN 'job_offering' THEN 'تتوفر فرصة عمل، يرجى التواصل لمعرفة التفاصيل.'
    WHEN 'service_offering' THEN 'نقدم خدمات مهنية بجودة عالية وفي الوقت المحدد.'
    WHEN 'service_requesting' THEN 'أبحث عن مزود خدمة مناسب في هذا المجال.'
    WHEN 'product_offering' THEN 'تشكيلة متنوعة متوفرة للطلب.'
    WHEN 'material_offering' THEN 'مواد وأقمشة متنوعة متوفرة.'
    WHEN 'material_requesting' THEN 'أبحث عن مواد مناسبة للإنتاج.'
    WHEN 'reel' THEN 'لقطات من أعمالنا ومنتجاتنا.'
  END,
  CASE WHEN p.type = 'reel' THEN 'video'::"MediaType"
       ELSE 'image'::"MediaType"
  END,
  CASE WHEN p.type = 'reel' THEN ARRAY[]::text[]
       ELSE ARRAY[
         'https://picsum.photos/id/' || (10 + ((p.number - 1) % 70))::text || '/600/800'
       ]::text[]
  END,
  CASE WHEN p.type = 'reel' THEN
    CASE ((p.number - 1) % 5)
      WHEN 0 THEN 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'
      WHEN 1 THEN 'https://www.w3schools.com/html/mov_bbb.mp4'
      WHEN 2 THEN 'https://res.cloudinary.com/demo/video/upload/dog.mp4'
      WHEN 3 THEN 'https://res.cloudinary.com/demo/video/upload/elephants.mp4'
      ELSE 'https://res.cloudinary.com/demo/video/upload/snow_horses.mp4'
    END
    ELSE NULL
  END,
  CASE WHEN p.type = 'reel' THEN
    'https://picsum.photos/id/' || (10 + ((p.number - 1) % 70))::text || '/600/800'
    ELSE NULL
  END,
  p.location,
  true,
  'approved'::"PostApprovalStatus",
  CASE p.type
    WHEN 'job_seeking' THEN 'إنتاج/صناعة'
    WHEN 'job_offering' THEN 'إنتاج/صناعة'
    WHEN 'service_offering' THEN 'خياطة'
    WHEN 'service_requesting' THEN 'خياطة'
    WHEN 'product_offering' THEN 'ألبسة'
    WHEN 'material_offering' THEN 'أقمشة'
    WHEN 'material_requesting' THEN 'أقمشة'
    ELSE NULL
  END,
  CASE WHEN p.type = 'product_offering' THEN 'جملة' ELSE NULL END,
  CASE WHEN p.type IN ('product_offering', 'material_offering')
       THEN 'سعر ثابت' ELSE NULL
  END,
  CASE WHEN p.type = 'product_offering' THEN (35000 + p.number * 1000)::text
       WHEN p.type = 'material_offering' THEN (20000 + p.number * 500)::text
       ELSE NULL
  END,
  CASE WHEN p.type IN ('job_seeking', 'job_offering')
       THEN ARRAY['كامل']::text[] ELSE ARRAY[]::text[]
  END,
  CASE WHEN p.type IN ('job_seeking', 'job_offering')
       THEN ARRAY['خياطة']::text[] ELSE ARRAY[]::text[]
  END,
  NOW() - (p.number::text || ' hours')::interval,
  NOW()
FROM posts p
ON CONFLICT (id) DO NOTHING;

-- Summary: each listed public user should have 15 posts from this seed.
SELECT
  u.phone,
  u.role,
  COUNT(p.id) AS seeded_posts
FROM "User" u
LEFT JOIN "Post" p
  ON p."authorId" = u.id
  AND p.id LIKE 'demo-post-' || md5(u.id) || '-%'
WHERE u.role IN (
  'employee',
  'workshop',
  'institute',
  'store',
  'marketer',
  'shipping_company'
)
  AND u.suspended = false
GROUP BY u.id, u.phone, u.role
ORDER BY u.role, u.phone;
