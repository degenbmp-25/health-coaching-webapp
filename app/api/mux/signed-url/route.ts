import { NextRequest, NextResponse } from 'next/server';
import { getSignedPlaybackUrl } from '@/lib/mux';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const playbackId = searchParams.get('playbackId');

  if (!playbackId) {
    return NextResponse.json({ error: 'playbackId is required' }, { status: 400 });
  }

  try {
    // Generate a signed URL with 1 hour expiration
    const signedUrl = await getSignedPlaybackUrl(playbackId, '1h');
    
    return NextResponse.json({ signedUrl, playbackId });
  } catch (error) {
    console.error('[MUX_SIGNED_URL] Error generating signed URL:', error);
    return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 });
  }
}
