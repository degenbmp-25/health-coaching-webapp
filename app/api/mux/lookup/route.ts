import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoUrl = searchParams.get('videoUrl');
    const exerciseName = searchParams.get('exerciseName');
    const organizationId = searchParams.get('organizationId');

    if (!videoUrl && !exerciseName) {
      return NextResponse.json(
        { success: false, error: 'videoUrl or exerciseName parameter required' },
        { status: 400 }
      );
    }

    // Build search term from videoUrl filename or use exerciseName directly
    let searchTerm = exerciseName;
    if (!searchTerm && videoUrl) {
      // Extract name from filename: "book opener.MOV" -> "book opener"
      const filename = videoUrl.split('/').pop() || videoUrl;
      searchTerm = filename.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ').trim();
    }

    // If organizationId is provided, query organization_videos directly by title
    if (organizationId && searchTerm) {
      const videos = await prisma.organizationVideo.findMany({
        where: {
          organizationId,
          status: 'ready',
          title: {
            // Match if video title contains any significant word from exercise name
            // or if exercise name contains words from video title
            // Use case-insensitive matching via SQL ILIKE
          }
        },
        select: {
          muxPlaybackId: true,
          title: true
        }
      });

      // Word-level matching: split search term into words and find best match
      const searchWords = searchTerm.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      
      let bestMatch: { muxPlaybackId: string | null; title: string } | null = null;
      let bestScore = 0;

      for (const video of videos) {
        const titleWords = video.title.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        
        // Count matching words (in either direction)
        let matchCount = 0;
        for (const sw of searchWords) {
          if (titleWords.some(tw => tw.includes(sw) || sw.includes(tw))) {
            matchCount++;
          }
        }
        
        // Also check if title is contained in search term or vice versa
        const titleLower = video.title.toLowerCase();
        const searchLower = searchTerm.toLowerCase();
        if (titleLower.includes(searchLower) || searchLower.includes(titleLower)) {
          matchCount += 10; // Strong match for containment
        }

        if (matchCount > bestScore) {
          bestScore = matchCount;
          bestMatch = video;
        }
      }

      if (bestMatch && bestScore > 0) {
        return NextResponse.json({
          success: true,
          videoUrl,
          exerciseName: searchTerm,
          muxPlaybackId: bestMatch.muxPlaybackId,
          matchedTitle: bestMatch.title,
        });
      }
    }

    // Fallback: if no organizationId or no match found, try old behavior
    // Find workout exercises - try exact match first
    if (videoUrl) {
      let exercises = await prisma.workoutExercise.findMany({
        where: { videoUrl },
        select: { muxPlaybackId: true, muxAssetId: true }
      });

      // If no exact match, try normalized filename matching
      if (exercises.length === 0) {
        const filename = videoUrl.split('/').pop() || videoUrl;
        const normalizedName = filename.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ').toLowerCase();

        const allWithMux = await prisma.workoutExercise.findMany({
          where: { muxPlaybackId: { not: null } },
          select: { videoUrl: true, muxPlaybackId: true }
        });

        for (const ex of allWithMux) {
          if (!ex.videoUrl) continue;
          const exFilename = ex.videoUrl.split('/').pop() || ex.videoUrl;
          const exNormalized = exFilename.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ').toLowerCase();
          
          // Exact normalized match
          if (normalizedName === exNormalized) {
            exercises = [{ muxPlaybackId: ex.muxPlaybackId, muxAssetId: null }];
            break;
          }
        }
      }

      const playbackIds = exercises.map(e => e.muxPlaybackId).filter((id): id is string => id !== null);

      return NextResponse.json({
        success: true,
        videoUrl,
        muxPlaybackId: playbackIds[0] || null,
      });
    }

    return NextResponse.json({
      success: true,
      videoUrl,
      muxPlaybackId: null,
    });
  } catch (error) {
    console.error('Lookup error:', error);
    return NextResponse.json(
      { success: false, error: 'Lookup failed' },
      { status: 500 }
    );
  }
}
