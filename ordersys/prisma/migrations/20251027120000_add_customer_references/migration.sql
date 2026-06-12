-- CreateTable
CREATE TABLE "public"."CustomerReference" (
    "id" TEXT NOT NULL,
    "customerNumber" TEXT NOT NULL,
    "tenantId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerReference_tenantId_customerNumber_idx"
ON "public"."CustomerReference"("tenantId", "customerNumber");
