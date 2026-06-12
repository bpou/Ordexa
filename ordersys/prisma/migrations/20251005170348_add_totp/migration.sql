-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totpEnabledAt" TIMESTAMP(3),
ADD COLUMN     "totpSecret" TEXT,
ADD COLUMN     "totpTempSecret" TEXT;
