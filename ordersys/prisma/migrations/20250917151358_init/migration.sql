-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('SALJARE', 'A_TEAM', 'B_TEAM', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."Track" AS ENUM ('A', 'B', 'SHARED');

-- CreateEnum
CREATE TYPE "public"."TrackStatus" AS ENUM ('INKOMMANDE', 'PAGAENDE', 'LEVERANS', 'AVSLUTAD');

-- CreateEnum
CREATE TYPE "public"."DeliveryMethod" AS ENUM ('MONTAGE', 'HAMTAS', 'UTKORNING');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "public"."Role" NOT NULL DEFAULT 'SALJARE',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "customerName" TEXT,
    "dueDate" TIMESTAMP(3),
    "deliveryMethod" "public"."DeliveryMethod",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrderTrack" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "track" "public"."Track" NOT NULL,
    "status" "public"."TrackStatus" NOT NULL DEFAULT 'INKOMMANDE',
    "colorHex" TEXT,
    "plannedStartAt" TIMESTAMP(3),
    "plannedEndAt" TIMESTAMP(3),
    "actualStartAt" TIMESTAMP(3),
    "actualEndAt" TIMESTAMP(3),
    "assignee" TEXT,

    CONSTRAINT "OrderTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CalendarEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "track" "public"."Track" NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."File" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "track" "public"."Track" NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FortnoxConnection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "scope" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FortnoxConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FortnoxOrderLink" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FortnoxOrderLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "public"."Order"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "OrderTrack_orderId_track_key" ON "public"."OrderTrack"("orderId", "track");

-- CreateIndex
CREATE UNIQUE INDEX "FortnoxOrderLink_orderId_key" ON "public"."FortnoxOrderLink"("orderId");

-- AddForeignKey
ALTER TABLE "public"."OrderTrack" ADD CONSTRAINT "OrderTrack_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CalendarEvent" ADD CONSTRAINT "CalendarEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."File" ADD CONSTRAINT "File_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FortnoxOrderLink" ADD CONSTRAINT "FortnoxOrderLink_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
