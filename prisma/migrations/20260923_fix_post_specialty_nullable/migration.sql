-- The migration 20260922093611_post_specialty_single_skills_deleted_at
-- set "specialty" to NOT NULL. The schema declares it as String?.
-- On databases where that earlier migration has run, drop the constraint.
-- On databases where it hasn't (fresh deploys), this is a no-op because
-- the column is already nullable by the time the schema is applied.
--
-- Idempotent: safe to run whether the column is NOT NULL or already nullable.
ALTER TABLE "Post" ALTER COLUMN "specialty" DROP NOT NULL;