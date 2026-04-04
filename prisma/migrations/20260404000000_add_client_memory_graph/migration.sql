-- Migration: add_client_memory_graph
-- Created: 2026-04-04
-- Description: Add ClientNote, ClientTag, ClientNoteTag models for Client Memory Graph feature

-- Create client_notes table
CREATE TABLE "client_notes" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "note_type" TEXT NOT NULL DEFAULT 'general',
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "client_notes_pkey" PRIMARY KEY ("id")
);

-- Create index for client notes
CREATE INDEX "client_notes_client_id_created_at_idx" ON "client_notes"("client_id", "created_at" DESC);

-- Add FK constraint for client_notes -> users (client)
ALTER TABLE "client_notes" ADD CONSTRAINT "client_notes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add FK constraint for client_notes -> users (author)
ALTER TABLE "client_notes" ADD CONSTRAINT "client_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create client_tags table
CREATE TABLE "client_tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#888888',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "client_tags_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint for tag names
CREATE UNIQUE INDEX "client_tags_name_key" ON "client_tags"("name");

-- Create client_note_tags junction table
CREATE TABLE "client_note_tags" (
    "note_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    CONSTRAINT "client_note_tags_pkey" PRIMARY KEY ("note_id", "tag_id")
);

-- Add FK constraint for client_note_tags -> client_notes
ALTER TABLE "client_note_tags" ADD CONSTRAINT "client_note_tags_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "client_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add FK constraint for client_note_tags -> client_tags
ALTER TABLE "client_note_tags" ADD CONSTRAINT "client_note_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "client_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
