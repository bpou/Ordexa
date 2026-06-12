-- Track per-person time and preserve who entered each change.
CREATE TABLE "OrderTrackTimeEntry" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "track" "Track" NOT NULL,
    "minutes" INTEGER NOT NULL,
    "userId" TEXT,
    "userName" TEXT NOT NULL,
    "userImage" TEXT,
    "createdById" TEXT,
    "createdByName" TEXT NOT NULL,
    "createdByImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderTrackTimeEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderTrackTimeEntry_orderId_track_createdAt_idx" ON "OrderTrackTimeEntry"("orderId", "track", "createdAt");
CREATE INDEX "OrderTrackTimeEntry_userId_idx" ON "OrderTrackTimeEntry"("userId");

ALTER TABLE "OrderTrackTimeEntry" ADD CONSTRAINT "OrderTrackTimeEntry_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("orderNumber") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderTrackTimeEntry" ADD CONSTRAINT "OrderTrackTimeEntry_orderId_track_fkey"
    FOREIGN KEY ("orderId", "track") REFERENCES "OrderTrack"("orderId", "track") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderTrackTimeEntry" ADD CONSTRAINT "OrderTrackTimeEntry_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrderTrackTimeEntry" ADD CONSTRAINT "OrderTrackTimeEntry_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "File"
    ADD COLUMN "uploadedById" TEXT,
    ADD COLUMN "uploadedByName" TEXT,
    ADD COLUMN "uploadedByImage" TEXT;
