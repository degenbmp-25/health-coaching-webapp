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
    
    // If no exact match, try partial match (DB might store shortened version)
    // sheets videoUrl = "SMR trap/shoulder.MOV", DB videoUrl = "shoulder.MOV"
    // We want to match where the DB videoUrl is contained in or matches the end of sheets URL
    if (exercises.length === 0) {
      // Get the filename from the sheets URL (after last /)
      const filename = videoUrl.split('/').pop() || videoUrl;
      exercises = await prisma.workoutExercise.findMany({
        where: { 
          OR: [
            { videoUrl: { endsWith: filename } }, // DB ends with "shoulder.MOV"
            { videoUrl: videoUrl }, // Already tried exact match above
          ]
        },
        select: { muxPlaybackId: true, muxAssetId: true }
      });
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
