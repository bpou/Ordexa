-- CreateTable
CREATE TABLE "OutlookCalendarConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerUserId" TEXT,
    "providerEmail" TEXT,
    "displayName" TEXT,
    "calendarId" TEXT DEFAULT 'primary',
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenType" TEXT,
    "scope" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "syncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutlookCalendarConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutlookCalendarSync" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "externalICalUId" TEXT,
    "personalEventId" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutlookCalendarSync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OutlookCalendarConnection_userId_key" ON "OutlookCalendarConnection"("userId");

-- CreateIndex
CREATE INDEX "OutlookCalendarConnection_providerEmail_idx" ON "OutlookCalendarConnection"("providerEmail");

-- CreateIndex
CREATE UNIQUE INDEX "OutlookCalendarSync_personalEventId_key" ON "OutlookCalendarSync"("personalEventId");

-- CreateIndex
CREATE UNIQUE INDEX "OutlookCalendarSync_connectionId_externalEventId_key" ON "OutlookCalendarSync"("connectionId", "externalEventId");

-- CreateIndex
CREATE INDEX "OutlookCalendarSync_connectionId_lastSeenAt_idx" ON "OutlookCalendarSync"("connectionId", "lastSeenAt");

-- AddForeignKey
ALTER TABLE "OutlookCalendarConnection" ADD CONSTRAINT "OutlookCalendarConnection_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutlookCalendarSync" ADD CONSTRAINT "OutlookCalendarSync_connectionId_fkey"
    FOREIGN KEY ("connectionId") REFERENCES "OutlookCalendarConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutlookCalendarSync" ADD CONSTRAINT "OutlookCalendarSync_personalEventId_fkey"
    FOREIGN KEY ("personalEventId") REFERENCES "PersonalCalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
