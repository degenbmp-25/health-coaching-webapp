-- DropForeignKey
ALTER TABLE "activity_log" DROP CONSTRAINT "activity_log_activity_id_fkey";

-- AddForeignKey
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
