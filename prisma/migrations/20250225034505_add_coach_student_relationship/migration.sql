-- AlterTable
ALTER TABLE "users" ADD COLUMN     "coach_id" TEXT,
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'user';

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
