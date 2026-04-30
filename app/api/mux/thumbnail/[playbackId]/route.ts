import { NextRequest, NextResponse } from 'next/server'
import { getThumbnailUrl } from '@/lib/mux'

export async function GET(
  request: NextRequest,
  { params }: { params: { playbackId: string } }
) {
  try {
    const thumbnailUrl = await getThumbnailUrl(params.playbackId)

    return NextResponse.redirect(thumbnailUrl)
  } catch (error) {
    console.error('Thumbnail URL error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate thumbnail URL' },
      { status: 500 }
    )
  }
}
