import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Mux sends signatures as: t=timestamp,v1=signature.
function verifyWebhookSignature(
  rawBody: string,
  muxSignature: string,
  secret: string
): boolean {
  const crypto = require('crypto')
  const parts = muxSignature.split(',')
  let timestamp = ''
  let signature = ''

  for (const part of parts) {
    if (part.startsWith('t=')) {
      timestamp = part.substring(2)
    } else if (part.startsWith('v1=')) {
      signature = part.substring(3)
    }
  }

  if (!timestamp || !signature) {
    console.error('Invalid Mux signature format')
    return false
  }

  const timestampSeconds = Number(timestamp)
  const fiveMinutes = 5 * 60
  const now = Math.floor(Date.now() / 1000)
  if (!Number.isFinite(timestampSeconds) || Math.abs(now - timestampSeconds) > fiveMinutes) {
    console.error('Mux signature timestamp is outside tolerance')
    return false
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex')

  if (signature.length !== expectedSignature.length) {
    return false
  }

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('mux-signature')
    const webhookSecret = process.env.MUX_WEBHOOK_SECRET

    if (process.env.NODE_ENV === 'production') {
      if (!webhookSecret || !signature) {
        console.error('Mux webhook signature configuration is missing')
        return NextResponse.json({ error: 'Webhook signature required' }, { status: 401 })
      }

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
      const uploadId = body.data.upload_id
      const thumbnailUrl = playbackId ? `https://image.mux.com/${playbackId}/thumbnail.jpg` : null
      const duration = body.data.duration ? Math.floor(body.data.duration) : null

      if (!assetId) {
        console.error('No asset ID in webhook')
        return NextResponse.json({ error: 'No asset ID' }, { status: 400 })
      }

      // Find the OrganizationVideo with this asset ID
      const video = await db.organizationVideo.findFirst({
        where: {
          OR: [
            { muxAssetId: assetId },
            ...(uploadId ? [{ muxAssetId: uploadId }] : []),
          ],
        },
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
          muxAssetId: assetId,
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
      const uploadId = body.data.upload_id

      const video = await db.organizationVideo.findFirst({
        where: {
          OR: [
            { muxAssetId: assetId },
            ...(uploadId ? [{ muxAssetId: uploadId }] : []),
          ],
        },
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
      const assetId = typeof body.data.asset_id === 'string'
        ? body.data.asset_id
        : body.data.asset_id?.id

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
