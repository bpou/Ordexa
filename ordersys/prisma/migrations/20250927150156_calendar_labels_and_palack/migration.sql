-- CreateEnum
CREATE TYPE "public"."CalendarLabel" AS ENUM ('BOKAD_TID', 'KAN_FLYTTAS', 'LUNCH', 'SEMESTER', 'TRAFIKVERKET', 'UNDER_VECKAN', 'UTFORT_ARBETE');

-- AlterEnum
ALTER TYPE "public"."TrackStatus" ADD VALUE 'PALACK';

-- AlterTable
ALTER TABLE "public"."OrderTrack" ADD COLUMN     "calendarLabel" "public"."CalendarLabel";

-- RenameIndex
ALTER INDEX "public"."OrderTrack_track_status_idx" RENAME TO "ordertrack_track_status_idx";
