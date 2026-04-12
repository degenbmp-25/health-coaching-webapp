import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { db } from '@/lib/db'
import { getMuxCredentials } from '@/lib/mux'

// PATCH /api/organizations/[id]/videos/[videoId] - Update video (rename)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; videoId: string }> }
) {
  try {
    const { id: orgId, videoId } = await params
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

    // Get video to check it exists and belongs to org
    const video = await db.organizationVideo.findFirst({
      where: {
        id: videoId,
        organizationId: orgId
      }
    })

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    const body = await req.json()
    const { title } = body

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        return NextResponse.json({ error: 'Title must be a non-empty string' }, { status: 400 })
      }

      await db.organizationVideo.update({
        where: { id: videoId },
        data: { title: title.trim() }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating video:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/organizations/[id]/videos/[videoId] - Delete a video
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; videoId: string }> }
) {
  try {
    const { id: orgId, videoId } = await params
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

    // Get video to check it exists and belongs to org
    const video = await db.organizationVideo.findFirst({
      where: {
        id: videoId,
        organizationId: orgId
      }
    })

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    // Delete from Mux (if we have a real asset ID)
    const { tokenId: muxTokenId, tokenSecret: muxTokenSecret } = getMuxCredentials()

    if (muxTokenId && muxTokenSecret && video.muxAssetId) {
      const credentials = Buffer.from(`${muxTokenId}:${muxTokenSecret}`).toString('base64')
      
      // Try to delete from Mux (don't fail if this errors)
      try {
        await fetch(`https://api.mux.com/video/v1/assets/${video.muxAssetId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Basic ${credentials}`
          }
        })
      } catch (muxError) {
        console.warn('Failed to delete Mux asset:', muxError)
      }
    }

    // Delete from database
    await db.organizationVideo.delete({
      where: { id: videoId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting video:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
