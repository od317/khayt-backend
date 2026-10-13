-- Allow users to register without a display name; collect it later via PATCH /auth/me.
ALTER TABLE "User" ALTER COLUMN "name" DROP NOT NULL;
