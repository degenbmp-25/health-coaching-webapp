import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { db } from '@/lib/db'
import { getMuxCredentials } from '@/lib/mux'
import Mux from '@mux/mux-node'

// GET /api/organizations/[id]/videos - List all videos for an organization
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orgId } = await params
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user can manage videos in this organization
    const membership = await db.organizationMember.findFirst({
      where: {
        organizationId: orgId,
        userId: user.id,
        role: { in: ['owner', 'trainer', 'coach'] }
      }
    })

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const videos = await db.organizationVideo.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ videos })
  } catch (error) {
    console.error('Error fetching videos:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/organizations/[id]/videos - Create a video upload URL (get Mux upload URL)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orgId } = await params
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user can manage videos in this organization
    const membership = await db.organizationMember.findFirst({
      where: {
        organizationId: orgId,
        userId: user.id,
        role: { in: ['owner', 'trainer', 'coach'] }
      }
    })

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { title } = body

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Get Mux credentials
    const { tokenId: muxTokenId, tokenSecret: muxTokenSecret } = getMuxCredentials()

    if (!muxTokenId || !muxTokenSecret) {
      console.error('[Mux] Mux credentials are missing from environment variables')
      return NextResponse.json({ error: 'Mux credentials not configured on server' }, { status: 500 })
    }

    try {
      // Use Mux SDK to create upload URL
      // Note: @mux/mux-node v12 uses tokenId and tokenSecret directly
      const mux = new Mux({
        tokenId: muxTokenId,
        tokenSecret: muxTokenSecret,
      })
      
      const requestOrigin = req.headers.get('origin')
      const appUrl = process.env.NEXT_PUBLIC_APP_URL
      const corsOrigin = requestOrigin?.startsWith('http')
        ? requestOrigin
        : appUrl?.startsWith('http')
          ? appUrl
          : 'https://app.habithletics.com'
      
      console.log('[DEBUG] Creating upload with cors_origin:', corsOrigin)
      
      const upload = await mux.video.uploads.create({
        new_asset_settings: {
          playback_policy: ['signed'],
          encoding_tier: 'baseline',
          mp4_support: 'capped-1080p',
        },
        cors_origin: corsOrigin,
      })

      console.log('[DEBUG] Mux upload created successfully:', JSON.stringify({ id: upload.id, url: upload.url, asset_id: upload.asset_id }))

      // Create video record in database
      const video = await db.organizationVideo.create({
        data: {
          organizationId: orgId,
          muxAssetId: upload.asset_id || upload.id, // Use upload ID as fallback
          title,
          status: 'pending'
        }
      })

      return NextResponse.json({
        video,
        uploadUrl: upload.url,
        uploadId: upload.id
      })
    } catch (muxError) {
      console.error('[DEBUG] Mux SDK error:', muxError)
      console.error('[DEBUG] Mux error type:', muxError?.constructor?.name)
      console.error('[DEBUG] Mux error message:', muxError instanceof Error ? muxError.message : String(muxError))
      console.error('[DEBUG] Mux error stack:', muxError instanceof Error ? muxError.stack : 'no stack')
      
      // Return more specific error for Mux issues
      if (muxError instanceof Error) {
        // Check for common Mux errors
        if (muxError.message.includes('401') || muxError.message.includes('authentication')) {
          return NextResponse.json({ error: 'Mux authentication failed. Please check credentials.' }, { status: 500 })
        }
        if (muxError.message.includes('403') || muxError.message.includes('forbidden')) {
          return NextResponse.json({ error: 'Mux access forbidden. Check permissions.' }, { status: 500 })
        }
        return NextResponse.json({ error: 'Failed to create upload URL', details: muxError.message }, { status: 500 })
      }
      return NextResponse.json({ error: 'Failed to create upload URL', details: String(muxError) }, { status: 500 })
    }
  } catch (error) {
    console.error('[DEBUG] Outer error creating video:', error)
    console.error('[DEBUG] Error details:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
