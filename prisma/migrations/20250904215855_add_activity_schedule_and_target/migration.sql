-- AlterTable
ALTER TABLE "activities" ADD COLUMN     "scheduled_days" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "target_count" INTEGER;
