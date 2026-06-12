ALTER TABLE "public"."OutlookCalendarConnection"
ADD COLUMN "webhookSubscriptionId" TEXT,
ADD COLUMN "webhookClientState" TEXT,
ADD COLUMN "webhookExpiresAt" TIMESTAMP(3);
