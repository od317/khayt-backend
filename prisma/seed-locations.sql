-- Seed cities / governorates only (no users, posts, areas).
-- Safe to re-run: upserts by fixed id.

INSERT INTO "Location" (
  id, name, "parentId", "sortOrder", active,
  "centerLat", "centerLng", "radiusKm", "createdAt"
)
VALUES
  ('loc-damascus', 'دمشق', NULL, 1, true, 33.5138, 36.2765, 18, NOW()),
  ('loc-rural-damascus', 'ريف دمشق', NULL, 2, true, 33.5167, 36.3, 55, NOW()),
  ('loc-halep', 'حلب', NULL, 3, true, 36.2021, 37.1343, 35, NOW()),
  ('loc-homs', 'حمص', NULL, 4, true, 34.7268, 36.7234, 30, NOW()),
  ('loc-hama', 'حماة', NULL, 5, true, 35.1318, 36.7578, 28, NOW()),
  ('loc-lattakia', 'اللاذقية', NULL, 6, true, 35.5311, 35.7911, 25, NOW()),
  ('loc-tartous', 'طرطوس', NULL, 7, true, 34.889, 35.8866, 22, NOW()),
  ('loc-idlib', 'إدلب', NULL, 8, true, 35.9306, 36.6339, 30, NOW()),
  ('loc-deir-ezzor', 'دير الزور', NULL, 9, true, 35.3333, 40.15, 40, NOW()),
  ('loc-hasakah', 'الحسكة', NULL, 10, true, 36.5024, 40.7463, 45, NOW()),
  ('loc-raqqa', 'الرقة', NULL, 11, true, 35.9506, 39.0112, 35, NOW()),
  ('loc-daraa', 'درعا', NULL, 12, true, 32.6189, 36.1021, 30, NOW()),
  ('loc-sweida', 'السويداء', NULL, 13, true, 32.7089, 36.5695, 28, NOW()),
  ('loc-quneitra', 'القنيطرة', NULL, 14, true, 33.1253, 35.8247, 20, NOW()),
  ('loc-outside-syria', 'خارج سوريا', NULL, 15, true, NULL, NULL, NULL, NOW()),
  ('loc-remote', 'عمل عن بعد', NULL, 16, true, NULL, NULL, NULL, NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  "parentId" = EXCLUDED."parentId",
  "sortOrder" = EXCLUDED."sortOrder",
  active = EXCLUDED.active,
  "centerLat" = EXCLUDED."centerLat",
  "centerLng" = EXCLUDED."centerLng",
  "radiusKm" = EXCLUDED."radiusKm";
