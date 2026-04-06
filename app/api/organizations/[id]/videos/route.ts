import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { db } from '@/lib/db'

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

    // Verify user is owner/trainer in this organization
    const membership = await db.organizationMember.findFirst({
      where: {
        organizationId: orgId,
        userId: user.id,
        role: { in: ['owner', 'trainer'] }
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

    // Verify user is owner/trainer in this organization
    const membership = await db.organizationMember.findFirst({
      where: {
        organizationId: orgId,
        userId: user.id,
        role: { in: ['owner', 'trainer'] }
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
    const muxTokenId = process.env.MUX_TOKEN_ID
    const muxTokenSecret = process.env.MUX_TOKEN_SECRET

    if (!muxTokenId || !muxTokenSecret) {
      return NextResponse.json({ error: 'Mux not configured' }, { status: 500 })
    }

    // Create Mux upload URL
    const credentials = Buffer.from(`${muxTokenId}:${muxTokenSecret}`).toString('base64')
    
    const muxResponse = await fetch('https://api.mux.com/video/v1/uploads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`
      },
      body: JSON.stringify({
        cors_origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        new_asset_settings: {
          playback_policy: ['signed'],
          mp4_support: 'capped-1080p'
        }
      })
    })

    if (!muxResponse.ok) {
      const error = await muxResponse.text()
      console.error('Mux upload creation failed:', error)
      return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
    }

    const muxData = await muxResponse.json()
    const { id: uploadId, url: uploadUrl } = muxData.data
    const { id: assetId } = muxData.data.asset_id || {}

    // Create video record in database
    const video = await db.organizationVideo.create({
      data: {
        organizationId: orgId,
        muxAssetId: assetId || uploadId, // Use upload ID as fallback
        title,
        status: 'pending'
      }
    })

    return NextResponse.json({
      video,
      uploadUrl,
      uploadId
    })
  } catch (error) {
    console.error('Error creating video:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
