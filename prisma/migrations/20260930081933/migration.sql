-- DropIndex
DROP INDEX "Notification_createdAt_idx";

-- DropIndex
DROP INDEX "Notification_userId_read_idx";

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
