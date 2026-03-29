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

    // Find workout exercises with this videoUrl
    const exercises = await prisma.workoutExercise.findMany({
      where: { videoUrl },
      select: { muxPlaybackId: true, muxAssetId: true }
    });

    // Return unique playback IDs
    const playbackIds = [...new Set(exercises.map(e => e.muxPlaybackId).filter(Boolean))];

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
