import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { mux } from '@/lib/mux';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { playbackId: string } }
) {
  try {
    const { playbackId } = params;

    // In a real app, you'd verify the user is authorized here:
    // 1. Check if user is logged in (Clerk)
    // 2. Check if user has access to this video (organization membership)
    
    // For now, we'll generate a signed URL directly
    // The Mux player will use this playback ID with signed playback
    const token = await mux.jwt.signPlaybackId(playbackId, {
      type: 'jwt',
      keyId: process.env.MUX_SIGNING_KEY_ID!,
      keyPrivate: process.env.MUX_SIGNING_KEY!,
      expiration: '1h', // URLs valid for 1 hour
    });

    return NextResponse.json({
      success: true,
      playbackUrl: `https://stream.mux.com/${playbackId}.m3u8?token=${token}`,
    });
  } catch (error) {
    console.error('Playback URL error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate playback URL' },
      { status: 500 }
    );
  }
}
