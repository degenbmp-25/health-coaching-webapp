import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoUrl = searchParams.get('videoUrl');

    if (!videoUrl) {
      return NextResponse.json(
        { success: false, error: 'videoUrl parameter required' },
        { status: 400 }
      );
    }

    // Find workout exercises - try exact match first, then partial match
    // (sheets data may have "SMR trap/shoulder.MOV" while DB stores "shoulder.MOV")
    let exercises = await prisma.workoutExercise.findMany({
      where: { videoUrl },
      select: { muxPlaybackId: true, muxAssetId: true }
    });
    
    // If no exact match, try fuzzy matching
    // sheets data: "book opener.MOV", DB: "opener.MOV" - we need to match "opener" to "book opener"
    // sheets data: "SMR trap/shoulder.MOV", DB: "shoulder.MOV" - we need to match "shoulder" to "shoulder"
    if (exercises.length === 0) {
      // Get the pure filename (after last /) and name without extension
      const filename = videoUrl.split('/').pop() || videoUrl;
      const sheetsCoreName = filename.replace(/\.[^.]+$/, '').toLowerCase();
      
      // Fetch all exercises with muxPlaybackId and do fuzzy matching in JS
      const allWithMux = await prisma.workoutExercise.findMany({
        where: { muxPlaybackId: { not: null } },
        select: { videoUrl: true, muxPlaybackId: true }
      });
      
      // Find best match by comparing core names
      for (const ex of allWithMux) {
        if (!ex.videoUrl) continue;
        const dbCoreName = ex.videoUrl.replace(/\.[^.]+$/, '').toLowerCase();
        // Check if either core name contains the other
        // "book opener" vs "opener": "book opener".includes("opener") = true
        // "shoulder" vs "shoulder": both ways work
        if (sheetsCoreName.includes(dbCoreName) || dbCoreName.includes(sheetsCoreName)) {
          exercises = [{ muxPlaybackId: ex.muxPlaybackId, muxAssetId: null }];
          break;
        }
      }
    }

    // Return unique playback IDs
    const playbackIds = exercises.map(e => e.muxPlaybackId).filter((id): id is string => id !== null);

    return NextResponse.json({
      success: true,
      videoUrl,
      muxPlaybackId: playbackIds[0] || null,
    });
  } catch (error) {
    console.error('Lookup error:', error);
    return NextResponse.json(
      { success: false, error: 'Lookup failed' },
      { status: 500 }
    );
  }
}
