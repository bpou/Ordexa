ALTER TABLE "public"."OrderTrack" ADD COLUMN IF NOT EXISTS "timeSpentMinutes" INTEGER DEFAULT 0;

UPDATE "public"."OrderTrack"
SET "timeSpentMinutes" = 0
WHERE "timeSpentMinutes" IS NULL;

ALTER TABLE "public"."OrderTrack" ALTER COLUMN "timeSpentMinutes" SET DEFAULT 0;
ALTER TABLE "public"."OrderTrack" ALTER COLUMN "timeSpentMinutes" SET NOT NULL;
