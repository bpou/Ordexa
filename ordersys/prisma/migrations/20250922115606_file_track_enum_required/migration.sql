/*
  Warnings:

  - Made the column `track` on table `File` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."File" ALTER COLUMN "track" SET NOT NULL;
