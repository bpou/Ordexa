CREATE TABLE "public"."OutlookTrackCalendarSync" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "track" "public"."Track" NOT NULL,
    "calendarId" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "calendarEventId" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutlookTrackCalendarSync_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."OutlookTrackCalendarSubscription" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "track" "public"."Track" NOT NULL,
    "calendarId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "clientState" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutlookTrackCalendarSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OutlookTrackCalendarSync_calendarEventId_key" ON "public"."OutlookTrackCalendarSync"("calendarEventId");
CREATE UNIQUE INDEX "OutlookTrackCalendarSync_connectionId_calendarId_externalEventId_key" ON "public"."OutlookTrackCalendarSync"("connectionId", "calendarId", "externalEventId");
CREATE INDEX "OutlookTrackCalendarSync_track_calendarId_lastSeenAt_idx" ON "public"."OutlookTrackCalendarSync"("track", "calendarId", "lastSeenAt");

CREATE UNIQUE INDEX "OutlookTrackCalendarSubscription_subscriptionId_key" ON "public"."OutlookTrackCalendarSubscription"("subscriptionId");
CREATE UNIQUE INDEX "OutlookTrackCalendarSubscription_connectionId_track_key" ON "public"."OutlookTrackCalendarSubscription"("connectionId", "track");
CREATE INDEX "OutlookTrackCalendarSubscription_calendarId_expiresAt_idx" ON "public"."OutlookTrackCalendarSubscription"("calendarId", "expiresAt");

ALTER TABLE "public"."OutlookTrackCalendarSync"
ADD CONSTRAINT "OutlookTrackCalendarSync_connectionId_fkey"
FOREIGN KEY ("connectionId") REFERENCES "public"."OutlookCalendarConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."OutlookTrackCalendarSync"
ADD CONSTRAINT "OutlookTrackCalendarSync_calendarEventId_fkey"
FOREIGN KEY ("calendarEventId") REFERENCES "public"."CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."OutlookTrackCalendarSubscription"
ADD CONSTRAINT "OutlookTrackCalendarSubscription_connectionId_fkey"
FOREIGN KEY ("connectionId") REFERENCES "public"."OutlookCalendarConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
