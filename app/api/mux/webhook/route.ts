import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Verify Mux webhook signature
function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require('crypto')
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')
  return signature === expectedSignature
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('mux-signature')
    const webhookSecret = process.env.MUX_WEBHOOK_SECRET

    // Verify signature in production
    if (process.env.NODE_ENV === 'production' && webhookSecret && signature) {
      if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const body = JSON.parse(rawBody)
    console.log('Mux webhook received:', body.type, body.data?.id)

    // Handle video.asset.ready event
    if (body.type === 'video.asset.ready') {
      const assetId = body.data.id
      const playbackId = body.data.playback_ids?.[0]?.id
      const thumbnailUrl = body.data.thumbnail_urls?.[0]?.replace(/\?.*/, '') // Remove query params
      const duration = body.data.duration ? Math.floor(body.data.duration) : null

      if (!assetId) {
        console.error('No asset ID in webhook')
        return NextResponse.json({ error: 'No asset ID' }, { status: 400 })
      }

      // Find the OrganizationVideo with this asset ID
      const video = await db.organizationVideo.findFirst({
        where: { muxAssetId: assetId }
      })

      if (!video) {
        console.error('No video found for asset ID:', assetId)
        return NextResponse.json({ error: 'Video not found' }, { status: 404 })
      }

      // Update the video with playback ID and mark as ready
      await db.organizationVideo.update({
        where: { id: video.id },
        data: {
          muxPlaybackId: playbackId || null,
          thumbnailUrl: thumbnailUrl || null,
          duration: duration || null,
          status: 'ready'
        }
      })

      console.log('Video updated:', video.id, 'playbackId:', playbackId)
      return NextResponse.json({ received: true, videoId: video.id })
    }

    // Handle video.asset.errored event
    if (body.type === 'video.asset.errored') {
      const assetId = body.data.id

      const video = await db.organizationVideo.findFirst({
        where: { muxAssetId: assetId }
      })

      if (video) {
        await db.organizationVideo.update({
          where: { id: video.id },
          data: { status: 'errored' }
        })
        console.error('Video errored:', video.id)
      }

      return NextResponse.json({ received: true })
    }

    // Handle video.upload.asset_created (alternative event from Mux)
    if (body.type === 'video.upload.asset_created') {
      const uploadId = body.data.id
      const assetId = body.data.asset_id?.id

      if (uploadId) {
        // Find pending video with this upload ID as asset ID
        const video = await db.organizationVideo.findFirst({
          where: {
            muxAssetId: uploadId,
            status: 'pending'
          }
        })

        if (video && assetId) {
          // Update with the new asset ID
          await db.organizationVideo.update({
            where: { id: video.id },
            data: { muxAssetId: assetId }
          })
          console.log('Video asset ID updated:', video.id, 'new assetId:', assetId)
        }
      }

      return NextResponse.json({ received: true })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Mux webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
