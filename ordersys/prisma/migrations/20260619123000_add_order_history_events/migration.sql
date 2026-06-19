-- CreateTable
CREATE TABLE "OrderHistoryEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderHistoryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderHistoryEvent_orderId_createdAt_idx" ON "OrderHistoryEvent"("orderId", "createdAt");

-- AddForeignKey
ALTER TABLE "OrderHistoryEvent" ADD CONSTRAINT "OrderHistoryEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("orderNumber") ON DELETE CASCADE ON UPDATE CASCADE;
