CREATE TABLE "public"."StoredFile" (
  "key" TEXT NOT NULL,
  "body" BYTEA NOT NULL,
  "contentType" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StoredFile_pkey" PRIMARY KEY ("key")
);
