-- AlterTable
ALTER TABLE "User" ALTER COLUMN "role" TYPE TEXT USING "role"::text;

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "selectable" BOOLEAN NOT NULL DEFAULT true,
    "system" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_value_key" ON "Role"("value");

-- CreateIndex
CREATE INDEX "Role_selectable_sortOrder_idx" ON "Role"("selectable", "sortOrder");

-- Seed default roles (descriptions start as null so admins can fill them in)
INSERT INTO "Role" ("id", "value", "label", "description", "selectable", "system", "sortOrder", "createdAt", "updatedAt")
VALUES
  ('role-employee', 'employee', 'موظف', NULL, true, true, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role-workshop', 'workshop', 'مشغل / معمل', NULL, true, true, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role-store', 'store', 'متجر', NULL, true, true, 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role-institute', 'institute', 'معهد', NULL, false, true, 40, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role-super-admin', 'super_admin', 'مدير عام', NULL, false, true, 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role-admin', 'admin', 'مدير', NULL, false, true, 110, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role-inventory', 'inventory', 'مستودع', NULL, false, true, 120, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role-delivery', 'delivery', 'توصيل', NULL, false, true, 130, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
