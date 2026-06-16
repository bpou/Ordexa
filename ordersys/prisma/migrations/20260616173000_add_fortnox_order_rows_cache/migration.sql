ALTER TABLE "Order" ADD COLUMN "fortnoxOrderRows" JSONB;
ALTER TABLE "Order" ADD COLUMN "fortnoxOrderRowsSyncedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "fortnoxOrderRowsSyncError" TEXT;
