-- CreateTable
CREATE TABLE "organization_videos" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "mux_asset_id" TEXT NOT NULL,
    "mux_playback_id" TEXT,
    "title" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "duration" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_videos_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "organization_videos" ADD CONSTRAINT "organization_videos_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
