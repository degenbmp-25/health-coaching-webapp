import { NextRequest, NextResponse } from 'next/server';
import { mux } from '@/lib/mux';

export async function GET(
  request: NextRequest,
  { params }: { params: { playbackId: string } }
) {
  try {
    const { playbackId } = params;

    // In a real app, you'd verify the user is authorized here:
    // 1. Check if user is logged in (Clerk)
    // 2. Check if user has access to this video (organization membership)
    
    // Generate a signed playback URL (valid for 1 hour)
    const playbackUrl = await mux.jwt.signPlaybackId(playbackId, {
      expiration: '1h',
    });

    return NextResponse.json({
      success: true,
      playbackUrl: `https://stream.mux.com/${playbackId}.m3u8?token=${playbackUrl}`,
    });
  } catch (error) {
    console.error('Playback URL error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate playback URL' },
      { status: 500 }
    );
  }
}
