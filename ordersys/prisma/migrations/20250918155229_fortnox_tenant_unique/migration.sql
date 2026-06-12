/*
  Warnings:

  - A unique constraint covering the columns `[tenantId]` on the table `FortnoxConnection` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "FortnoxConnection_tenantId_key" ON "public"."FortnoxConnection"("tenantId");
