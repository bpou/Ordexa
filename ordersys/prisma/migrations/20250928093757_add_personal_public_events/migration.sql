-- CreateEnum
CREATE TYPE "public"."EventVisibility" AS ENUM ('PUBLIC', 'PERSONAL');

-- CreateTable
CREATE TABLE "public"."PersonalCalendarEvent" (
    "id" TEXT NOT NULL,
    "track" "public"."Track" NOT NULL,
    "title" TEXT NOT NULL,
    "label" "public"."CalendarLabel",
    "notes" TEXT,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "start" TIMESTAMP(3),
    "end" TIMESTAMP(3),
    "weeklyDays" TEXT,
    "startRecur" TIMESTAMP(3),
    "endRecur" TIMESTAMP(3),
    "startTime" TEXT,
    "endTime" TEXT,
    "visibility" "public"."EventVisibility" NOT NULL DEFAULT 'PUBLIC',
    "ownerUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalCalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PersonalCalendarEvent_track_visibility_ownerUserId_idx" ON "public"."PersonalCalendarEvent"("track", "visibility", "ownerUserId");
