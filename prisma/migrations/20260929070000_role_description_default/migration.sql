-- If the first role catalog migration already ran with nullable descriptions,
-- backfill empty strings and lock the column.
UPDATE "Role" SET "description" = '' WHERE "description" IS NULL;

ALTER TABLE "Role" ALTER COLUMN "description" SET DEFAULT '';
ALTER TABLE "Role" ALTER COLUMN "description" SET NOT NULL;
