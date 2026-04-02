-- AlterTable
ALTER TABLE "programs" ADD COLUMN     "start_date" TIMESTAMP(3),
ADD COLUMN     "total_weeks" INTEGER;

-- AlterTable
ALTER TABLE "workouts" ADD COLUMN     "scheduled_date" TIMESTAMP(3);
