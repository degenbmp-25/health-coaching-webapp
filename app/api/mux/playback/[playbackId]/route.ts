import { NextRequest, NextResponse } from 'next/server';
import { getPlaybackUrl } from '@/lib/mux';

export async function GET(
  request: NextRequest,
  { params }: { params: { playbackId: string } }
) {
  try {
    const { playbackId } = params;

    // In a real app, you'd verify the user is authorized here:
    // 1. Check if user is logged in (Clerk)
    // 2. Check if user has access to this video (organization membership)
    
    // Generate a playback URL. Public playback IDs do not need a token; signed
    // playback IDs receive a short-lived token.
    const playbackUrl = await getPlaybackUrl(playbackId);

    return NextResponse.json({
      success: true,
      playbackUrl,
    });
  } catch (error) {
    console.error('Playback URL error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate playback URL' },
      { status: 500 }
    );
  }
}
