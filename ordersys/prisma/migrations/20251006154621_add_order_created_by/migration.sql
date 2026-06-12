-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "createdByName" TEXT;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
