-- Add new track enum values for C and D, and extend role enum for the new teams.
DO $$
BEGIN
  ALTER TYPE "Track" ADD VALUE IF NOT EXISTS 'C';
  ALTER TYPE "Track" ADD VALUE IF NOT EXISTS 'D';
  ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'C_TEAM';
  ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'D_TEAM';
END $$;