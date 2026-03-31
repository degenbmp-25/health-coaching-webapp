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
    // sheets data: "book opener.MOV", DB: "opener.MOV"
    // sheets data: "SMR trap/shoulder.MOV", DB: "shoulder.MOV"
    if (exercises.length === 0) {
      // Get the pure filename (after last /) and name without extension
      const filename = videoUrl.split('/').pop() || videoUrl;
      const nameWithoutExt = filename.replace(/\.[^.]+$/, '').toLowerCase();
      
      // Find DB entries where:
      // 1. DB filename ends with sheets filename (handles "SMR trap/shoulder.MOV" → "shoulder.MOV")
      // 2. DB name without extension is contained in sheets name (handles "book opener.MOV" → "opener")
      exercises = await prisma.workoutExercise.findMany({
        where: { 
          muxPlaybackId: { not: null },
          OR: [
            // DB ends with sheets filename: "shoulder.MOV".endsWith("shoulder.MOV") = true
            { videoUrl: { endsWith: filename } },
            // DB name contained in sheets name: "opener".includes("opener") = true  
            // For "book opener.MOV" vs "opener.MOV", we check if "book opener".includes("opener")
            { 
              videoUrl: {
                contains: nameWithoutExt
              }
            },
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
