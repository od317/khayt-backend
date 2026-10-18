-- Seed default PostOption catalog (publish chips).
-- Safe to re-run: upserts by fixed id. Does not delete admin-created rows
-- (e.g. your existing UUID specialties stay).

INSERT INTO "PostOption" (id, kind, "postTypes", label, "parentId", "sortOrder", active, "createdAt", "updatedAt")
VALUES
  -- job: specialties
  (
    'opt-job-specialty-production',
    'specialty',
    ARRAY['job_offering', 'job_seeking']::"PostType"[],
    'إنتاج/صناعة',
    NULL,
    0,
    true,
    NOW(),
    NOW()
  ),
  (
    'opt-job-specialty-management',
    'specialty',
    ARRAY['job_offering', 'job_seeking']::"PostType"[],
    'إدارة',
    NULL,
    1,
    true,
    NOW(),
    NOW()
  ),
  -- job: skills (parent = production specialty)
  (
    'opt-job-skill-sewing',
    'skill',
    ARRAY['job_offering', 'job_seeking']::"PostType"[],
    'خياطة',
    'opt-job-specialty-production',
    0,
    true,
    NOW(),
    NOW()
  ),
  (
    'opt-job-skill-cutting',
    'skill',
    ARRAY['job_offering', 'job_seeking']::"PostType"[],
    'قص',
    'opt-job-specialty-production',
    1,
    true,
    NOW(),
    NOW()
  ),
  -- job: work type
  (
    'opt-work-type-0',
    'work_type',
    ARRAY['job_offering', 'job_seeking']::"PostType"[],
    'كامل',
    NULL,
    0,
    true,
    NOW(),
    NOW()
  ),
  (
    'opt-work-type-1',
    'work_type',
    ARRAY['job_offering', 'job_seeking']::"PostType"[],
    'جزئي',
    NULL,
    1,
    true,
    NOW(),
    NOW()
  ),
  (
    'opt-work-type-2',
    'work_type',
    ARRAY['job_offering', 'job_seeking']::"PostType"[],
    'عن بعد',
    NULL,
    2,
    true,
    NOW(),
    NOW()
  ),
  -- job: salary type
  (
    'opt-salary-type-0',
    'salary_type',
    ARRAY['job_offering']::"PostType"[],
    'شهري',
    NULL,
    0,
    true,
    NOW(),
    NOW()
  ),
  (
    'opt-salary-type-1',
    'salary_type',
    ARRAY['job_offering']::"PostType"[],
    'يومي',
    NULL,
    1,
    true,
    NOW(),
    NOW()
  ),
  (
    'opt-salary-type-2',
    'salary_type',
    ARRAY['job_offering']::"PostType"[],
    'بالقطعة',
    NULL,
    2,
    true,
    NOW(),
    NOW()
  ),
  (
    'opt-salary-type-3',
    'salary_type',
    ARRAY['job_offering']::"PostType"[],
    'حسب الاتفاق',
    NULL,
    3,
    true,
    NOW(),
    NOW()
  ),
  -- service: specialties
  (
    'opt-service-specialty-sewing',
    'specialty',
    ARRAY['service_offering', 'service_requesting']::"PostType"[],
    'خياطة',
    NULL,
    0,
    true,
    NOW(),
    NOW()
  ),
  (
    'opt-service-specialty-design',
    'specialty',
    ARRAY['service_offering', 'service_requesting']::"PostType"[],
    'تصميم',
    NULL,
    1,
    true,
    NOW(),
    NOW()
  ),
  (
    'opt-service-specialty-embroidery',
    'specialty',
    ARRAY['service_offering', 'service_requesting']::"PostType"[],
    'تطريز',
    NULL,
    2,
    true,
    NOW(),
    NOW()
  ),
  (
    'opt-service-specialty-tools',
    'specialty',
    ARRAY['service_offering', 'service_requesting']::"PostType"[],
    'أدوات',
    NULL,
    3,
    true,
    NOW(),
    NOW()
  ),
  (
    'opt-service-specialty-cutting',
    'specialty',
    ARRAY['service_offering', 'service_requesting']::"PostType"[],
    'قص',
    NULL,
    4,
    true,
    NOW(),
    NOW()
  ),
  (
    'opt-service-specialty-alteration',
    'specialty',
    ARRAY['service_offering', 'service_requesting']::"PostType"[],
    'تعديل',
    NULL,
    5,
    true,
    NOW(),
    NOW()
  ),
  (
    'opt-service-specialty-ironing',
    'specialty',
    ARRAY['service_offering', 'service_requesting']::"PostType"[],
    'كي وتشطيب',
    NULL,
    6,
    true,
    NOW(),
    NOW()
  ),
  -- service: place
  (
    'opt-service-place-0',
    'service_place',
    ARRAY['service_offering']::"PostType"[],
    'في المشغل',
    NULL,
    0,
    true,
    NOW(),
    NOW()
  ),
  (
    'opt-service-place-1',
    'service_place',
    ARRAY['service_offering']::"PostType"[],
    'عند الزبون',
    NULL,
    1,
    true,
    NOW(),
    NOW()
  ),
  (
    'opt-service-place-2',
    'service_place',
    ARRAY['service_offering']::"PostType"[],
    'عن بعد',
    NULL,
    2,
    true,
    NOW(),
    NOW()
  ),
  -- service: pricing
  (
    'opt-pricing-0',
    'pricing',
    ARRAY['service_offering']::"PostType"[],
    'حسب الطلب',
    NULL,
    0,
    true,
    NOW(),
    NOW()
  ),
  (
    'opt-pricing-1',
    'pricing',
    ARRAY['service_offering']::"PostType"[],
    'بالساعة',
    NULL,
    1,
    true,
    NOW(),
    NOW()
  ),
  (
    'opt-pricing-2',
    'pricing',
    ARRAY['service_offering']::"PostType"[],
    'بالقطعة',
    NULL,
    2,
    true,
    NOW(),
    NOW()
  ),
  (
    'opt-pricing-3',
    'pricing',
    ARRAY['service_offering']::"PostType"[],
    'شهري',
    NULL,
    3,
    true,
    NOW(),
    NOW()
  ),
  -- product: specialties
  (
    'opt-product-specialty-men',
    'specialty',
    ARRAY['product_offering']::"PostType"[],
    'ألبسة رجالية',
    NULL,
    0,
    true,
    NOW(),
    NOW()
  ),
  (
    'opt-product-specialty-women',
    'specialty',
    ARRAY['product_offering']::"PostType"[],
    'ألبسة نسائية',
    NULL,
    1,
    true,
    NOW(),
    NOW()
  ),
  (
    'opt-product-specialty-kids',
    'specialty',
    ARRAY['product_offering']::"PostType"[],
    'ألبسة أطفال',
    NULL,
    2,
    true,
    NOW(),
    NOW()
  ),
  (
    'opt-product-specialty-shoes',
    'specialty',
    ARRAY['product_offering']::"PostType"[],
    'أحذية',
    NULL,
    3,
    true,
    NOW(),
    NOW()
  ),
  (
    'opt-product-specialty-accessories',
    'specialty',
    ARRAY['product_offering']::"PostType"[],
    'إكسسوارات',
    NULL,
    4,
    true,
    NOW(),
    NOW()
  ),
  -- product: sell method
  (
    'opt-sell-method-0',
    'sell_method',
    ARRAY['product_offering']::"PostType"[],
    'جملة',
    NULL,
    0,
    true,
    NOW(),
    NOW()
  ),
  (
    'opt-sell-method-1',
    'sell_method',
    ARRAY['product_offering']::"PostType"[],
    'مفرق',
    NULL,
    1,
    true,
    NOW(),
    NOW()
  ),
  (
    'opt-sell-method-2',
    'sell_method',
    ARRAY['product_offering']::"PostType"[],
    'كلاهما',
    NULL,
    2,
    true,
    NOW(),
    NOW()
  ),
  -- product: price method
  (
    'opt-price-method-0',
    'price_method',
    ARRAY['product_offering']::"PostType"[],
    'سعر ثابت',
    NULL,
    0,
    true,
    NOW(),
    NOW()
  ),
  (
    'opt-price-method-1',
    'price_method',
    ARRAY['product_offering']::"PostType"[],
    'حسب الكمية',
    NULL,
    1,
    true,
    NOW(),
    NOW()
  ),
  (
    'opt-price-method-2',
    'price_method',
    ARRAY['product_offering']::"PostType"[],
    'قابل للتفاوض',
    NULL,
    2,
    true,
    NOW(),
    NOW()
  ),
  -- material/tool: specialties
  (
    'opt-material-specialty-fabric',
    'specialty',
    ARRAY['material_offering', 'material_requesting']::"PostType"[],
    'أقمشة',
    NULL,
    0,
    true,
    NOW(),
    NOW()
  ),
  (
    'opt-material-specialty-machines',
    'specialty',
    ARRAY['material_offering', 'material_requesting']::"PostType"[],
    'ماكينات خياطة',
    NULL,
    1,
    true,
    NOW(),
    NOW()
  ),
  (
    'opt-material-specialty-wood',
    'specialty',
    ARRAY['material_offering', 'material_requesting']::"PostType"[],
    'خشب',
    NULL,
    2,
    true,
    NOW(),
    NOW()
  ),
  (
    'opt-material-specialty-thread',
    'specialty',
    ARRAY['material_offering', 'material_requesting']::"PostType"[],
    'خيوط',
    NULL,
    3,
    true,
    NOW(),
    NOW()
  ),
  (
    'opt-material-specialty-scissors',
    'specialty',
    ARRAY['material_offering', 'material_requesting']::"PostType"[],
    'مقصات',
    NULL,
    4,
    true,
    NOW(),
    NOW()
  ),
  (
    'opt-material-specialty-irons',
    'specialty',
    ARRAY['material_offering', 'material_requesting']::"PostType"[],
    'مكاوي',
    NULL,
    5,
    true,
    NOW(),
    NOW()
  ),
  (
    'opt-material-specialty-tools',
    'specialty',
    ARRAY['material_offering', 'material_requesting']::"PostType"[],
    'أدوات',
    NULL,
    6,
    true,
    NOW(),
    NOW()
  ),
  -- material/tool: condition
  (
    'opt-condition-0',
    'condition',
    ARRAY['material_offering', 'material_requesting']::"PostType"[],
    'جديدة',
    NULL,
    0,
    true,
    NOW(),
    NOW()
  ),
  (
    'opt-condition-1',
    'condition',
    ARRAY['material_offering', 'material_requesting']::"PostType"[],
    'مستعملة - ممتازة',
    NULL,
    1,
    true,
    NOW(),
    NOW()
  ),
  (
    'opt-condition-2',
    'condition',
    ARRAY['material_offering', 'material_requesting']::"PostType"[],
    'مستعملة - جيدة',
    NULL,
    2,
    true,
    NOW(),
    NOW()
  ),
  -- currency (SYP / USD)
  (
    'opt-currency-syp',
    'currency',
    ARRAY[
      'job_offering',
      'job_seeking',
      'service_offering',
      'service_requesting',
      'product_offering',
      'material_offering',
      'material_requesting'
    ]::"PostType"[],
    'ليرة سورية',
    NULL,
    0,
    true,
    NOW(),
    NOW()
  ),
  (
    'opt-currency-usd',
    'currency',
    ARRAY[
      'job_offering',
      'job_seeking',
      'service_offering',
      'service_requesting',
      'product_offering',
      'material_offering',
      'material_requesting'
    ]::"PostType"[],
    'دولار',
    NULL,
    1,
    true,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  kind = EXCLUDED.kind,
  "postTypes" = EXCLUDED."postTypes",
  label = EXCLUDED.label,
  "parentId" = EXCLUDED."parentId",
  "sortOrder" = EXCLUDED."sortOrder",
  active = EXCLUDED.active,
  "updatedAt" = NOW();
