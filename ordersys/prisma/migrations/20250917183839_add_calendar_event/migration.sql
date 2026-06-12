/*
  Warnings:

  - The primary key for the `Order` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Order` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."CalendarEvent" DROP CONSTRAINT "CalendarEvent_orderId_fkey";

-- DropForeignKey
ALTER TABLE "public"."File" DROP CONSTRAINT "File_orderId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FortnoxOrderLink" DROP CONSTRAINT "FortnoxOrderLink_orderId_fkey";

-- DropForeignKey
ALTER TABLE "public"."OrderTrack" DROP CONSTRAINT "OrderTrack_orderId_fkey";

-- DropIndex
DROP INDEX "public"."Order_orderNumber_key";

-- AlterTable
ALTER TABLE "public"."Order" DROP CONSTRAINT "Order_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "Order_pkey" PRIMARY KEY ("orderNumber");

-- AddForeignKey
ALTER TABLE "public"."OrderTrack" ADD CONSTRAINT "OrderTrack_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("orderNumber") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CalendarEvent" ADD CONSTRAINT "CalendarEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("orderNumber") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."File" ADD CONSTRAINT "File_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("orderNumber") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FortnoxOrderLink" ADD CONSTRAINT "FortnoxOrderLink_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("orderNumber") ON DELETE CASCADE ON UPDATE CASCADE;
