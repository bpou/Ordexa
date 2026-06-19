ALTER TABLE "NotificationPreference"
ADD COLUMN "trackFilters" "Track"[] DEFAULT ARRAY[]::"Track"[],
ADD COLUMN "userFilters" TEXT[] DEFAULT ARRAY[]::TEXT[];

UPDATE "NotificationPreference"
SET
  "trackFilters" = ARRAY[]::"Track"[],
  "userFilters" = ARRAY[]::TEXT[]
WHERE "trackFilters" IS NULL OR "userFilters" IS NULL;

ALTER TABLE "NotificationPreference"
ALTER COLUMN "trackFilters" SET NOT NULL,
ALTER COLUMN "userFilters" SET NOT NULL;
