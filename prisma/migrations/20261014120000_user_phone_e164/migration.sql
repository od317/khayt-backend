-- Normalize legacy Syrian local mobiles (09xxxxxxxx) to E.164 (+9639xxxxxxxx).
-- Prefer an existing E.164 row when both formats are present for the same number.

-- Drop local-format duplicates when the E.164 form already exists.
-- Clear phone first so the unique index is free, then soft-orphan is avoided
-- by nulling only when a matching E.164 account already exists.
UPDATE "User" u
SET phone = NULL
WHERE u.phone ~ '^09[0-9]{8}$'
  AND EXISTS (
    SELECT 1
    FROM "User" o
    WHERE o.phone = '+963' || substring(u.phone FROM 2)
  );

UPDATE "User"
SET phone = '+963' || substring(phone FROM 2)
WHERE phone ~ '^09[0-9]{8}$';
