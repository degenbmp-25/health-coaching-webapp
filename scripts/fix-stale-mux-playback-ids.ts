/**
 * Script to fix stale muxPlaybackId values in workout_exercises table.
 * 
 * Problem: Some workout exercises have muxPlaybackId set to:
 * 1. Asset IDs instead of playback IDs
 * 2. IDs of deleted videos
 * 
 * Solution: Update muxPlaybackId to match the organizationVideo's muxPlaybackId
 * when available, or clear it if the organizationVideo is deleted.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixStalePlaybackIds() {
  console.log('Starting stale muxPlaybackId fix...\n');

  // Find all workout exercises with muxPlaybackId set
  const workoutExercises = await prisma.workoutExercise.findMany({
    where: {
      muxPlaybackId: { not: null },
    },
    include: {
      organizationVideo: {
        select: {
          id: true,
          muxPlaybackId: true,
          status: true,
        },
      },
      exercise: {
        select: { name: true },
      },
    },
  });

  console.log(`Found ${workoutExercises.length} workout exercises with muxPlaybackId set.\n`);

  let fixed = 0;
  let cleared = 0;
  let alreadyCorrect = 0;
  let skipped = 0;

  for (const we of workoutExercises) {
    const currentPlaybackId = we.muxPlaybackId!;
    const orgVideo = we.organizationVideo;

    // If organizationVideo exists, check if muxPlaybackId needs updating
    if (orgVideo) {
      const correctPlaybackId = orgVideo.muxPlaybackId;
      const orgVideoStatus = orgVideo.status;

      if (orgVideoStatus !== 'ready' || !correctPlaybackId) {
        // Video is not ready or has no playback ID - clear it
        console.log(`[CLEAR] Exercise "${we.exercise.name}": video not ready or no playback ID`);
        console.log(`        Current: ${currentPlaybackId}`);
        console.log(`        OrgVideo status: ${orgVideoStatus}, playbackId: ${correctPlaybackId || 'null'}\n`);
        
        await prisma.workoutExercise.update({
          where: { id: we.id },
          data: { muxPlaybackId: null },
        });
        cleared++;
      } else if (currentPlaybackId !== correctPlaybackId) {
        // MuxPlaybackId doesn't match - fix it
        console.log(`[FIX] Exercise "${we.exercise.name}": muxPlaybackId mismatch`);
        console.log(`      Current:  ${currentPlaybackId}`);
        console.log(`      Correct:  ${correctPlaybackId} (from orgVideo "${orgVideo.id}")\n`);
        
        await prisma.workoutExercise.update({
          where: { id: we.id },
          data: { muxPlaybackId: correctPlaybackId },
        });
        fixed++;
      } else {
        // Already correct
        alreadyCorrect++;
      }
    } else {
      // No organizationVideo but has muxPlaybackId - this is legacy/stale data
      // Try to find the correct playback ID by searching organization videos
      
      // For now, just clear it since we can't verify it
      console.log(`[LEGACY] Exercise "${we.exercise.name}": no orgVideo relation but has muxPlaybackId`);
      console.log(`         muxPlaybackId: ${currentPlaybackId} (likely stale)\n`);
      
      // Try to find matching org video by muxPlaybackId
      const matchingOrgVideo = await prisma.organizationVideo.findFirst({
        where: {
          OR: [
            { muxPlaybackId: currentPlaybackId },
            { muxAssetId: currentPlaybackId },
          ],
        },
      });

      if (matchingOrgVideo && matchingOrgVideo.status === 'ready' && matchingOrgVideo.muxPlaybackId) {
        // Found a valid video - link it and use correct playback ID
        console.log(`         Found matching orgVideo: ${matchingOrgVideo.title}`);
        console.log(`         Updating organizationVideoId and muxPlaybackId...\n`);
        
        await prisma.workoutExercise.update({
          where: { id: we.id },
          data: {
            organizationVideoId: matchingOrgVideo.id,
            muxPlaybackId: matchingOrgVideo.muxPlaybackId,
          },
        });
        fixed++;
      } else {
        // No matching video found or video not ready - clear it
        console.log(`         No valid orgVideo found - clearing muxPlaybackId\n`);
        
        await prisma.workoutExercise.update({
          where: { id: we.id },
          data: { muxPlaybackId: null },
        });
        cleared++;
      }
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Already correct: ${alreadyCorrect}`);
  console.log(`Fixed: ${fixed}`);
  console.log(`Cleared: ${cleared}`);
  console.log(`Total processed: ${workoutExercises.length}`);
}

fixStalePlaybackIds()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  });
