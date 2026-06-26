-- DropIndex
DROP INDEX "Subscription_userId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");
