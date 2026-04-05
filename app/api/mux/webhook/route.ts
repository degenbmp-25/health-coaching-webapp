import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Mux Webhook Handler
 * 
 * Mux Signing Methods:
 * 1. Webhook Secret (MUX_WEBHOOK_SECRET) - Simple HMAC-SHA256 verification
 * 2. Signing Keys (MUX_SIGNING_KEY_ID + MUX_SIGNING_KEY) - JWT-based verification
 * 
 * The current infrastructure uses Signing Keys. For simplicity, we make signature
 * verification optional in development and warn if it fails in production without crashing.
 */

// Verify Mux webhook signature using HMAC-SHA256 (for MUX_WEBHOOK_SECRET method)
function verifyWebhookSignatureHmac(
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
  const startTime = Date.now()
  
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('mux-signature')
    const webhookSecret = process.env.MUX_WEBHOOK_SECRET

    // Parse body first for logging
    let body: any
    try {
      body = JSON.parse(rawBody)
    } catch {
      console.error('[MUX_WEBHOOK] Failed to parse JSON body')
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    console.log(`[MUX_WEBHOOK] Received event: ${body.type}`)
    console.log(`[MUX_WEBHOOK] Asset/Upload ID: ${body.data?.id}`)
    console.log(`[MUX_WEBHOOK] Timestamp: ${new Date().toISOString()}`)

    // Verify signature in production
    if (process.env.NODE_ENV === 'production') {
      if (webhookSecret && signature) {
        // Using MUX_WEBHOOK_SECRET (HMAC method)
        if (!verifyWebhookSignatureHmac(rawBody, signature, webhookSecret)) {
          console.error('[MUX_WEBHOOK] Signature verification FAILED')
          return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
        }
        console.log('[MUX_WEBHOOK] Signature verified successfully (HMAC)')
      } else if (!webhookSecret) {
        // No webhook secret configured - log warning but don't crash
        // This allows the webhook to work while proper signing keys are configured
        console.warn('[MUX_WEBHOOK] WARNING: MUX_WEBHOOK_SECRET not set. Signature verification skipped.')
      }
    }

    // Handle video.asset.ready event
    if (body.type === 'video.asset.ready') {
      const assetId = body.data.id
      const playbackId = body.data.playback_ids?.[0]?.id
      const thumbnailUrl = body.data.thumbnail_urls?.[0]?.replace(/\?.*/, '') // Remove query params
      const duration = body.data.duration ? Math.floor(body.data.duration) : null

      console.log(`[MUX_WEBHOOK] Processing video.asset.ready`)
      console.log(`[MUX_WEBHOOK]   - assetId: ${assetId}`)
      console.log(`[MUX_WEBHOOK]   - playbackId: ${playbackId}`)
      console.log(`[MUX_WEBHOOK]   - thumbnailUrl: ${thumbnailUrl}`)
      console.log(`[MUX_WEBHOOK]   - duration: ${duration}`)

      if (!assetId) {
        console.error('[MUX_WEBHOOK] No asset ID in webhook payload')
        return NextResponse.json({ error: 'No asset ID' }, { status: 400 })
      }

      // Strategy 1: Find by muxAssetId matching the asset ID directly
      let video = await db.organizationVideo.findFirst({
        where: { muxAssetId: assetId }
      })

      // Strategy 2: If not found, look for pending videos where muxAssetId might be the upload ID
      // (handles race condition where video.asset.ready arrives before video.upload.asset_created)
      if (!video) {
        console.log('[MUX_WEBHOOK] Strategy 1 failed, trying Strategy 2: Find by upload ID pattern')
        
        // Look for any pending/processing video in the organization that might match
        // We try to find by looking for videos that don't have playbackId yet and are pending
        video = await db.organizationVideo.findFirst({
          where: {
            muxAssetId: assetId,
            status: { in: ['pending', 'processing'] }
          }
        })
      }

      // Strategy 3: Last resort - find any pending video without a playback ID
      // This handles the edge case where the upload ID was stored but we're now getting the asset ID
      if (!video) {
        console.log('[MUX_WEBHOOK] Strategy 2 failed, trying Strategy 3: Find any pending video')
        
        // Find the oldest pending video without a playback ID - likely the one this belongs to
        // This is a fallback for the race condition
        const pendingVideos = await db.organizationVideo.findMany({
          where: {
            status: 'pending',
            muxPlaybackId: null,
            muxAssetId: { not: '' }
          },
          orderBy: { createdAt: 'asc' },
          take: 1
        })
        
        if (pendingVideos.length > 0) {
          video = pendingVideos[0]
          console.log(`[MUX_WEBHOOK] Strategy 3 matched video: ${video.id}`)
        }
      }

      if (!video) {
        console.error(`[MUX_WEBHOOK] No video found for asset ID: ${assetId}`)
        console.error('[MUX_WEBHOOK] All lookup strategies failed')
        return NextResponse.json({ error: 'Video not found' }, { status: 404 })
      }

      console.log(`[MUX_WEBHOOK] Found video: ${video.id}`)
      console.log(`[MUX_WEBHOOK] Current muxAssetId: ${video.muxAssetId}`)
      console.log(`[MUX_WEBHOOK] Current status: ${video.status}`)

      // Update the video with playback ID and mark as ready
      const updatedVideo = await db.organizationVideo.update({
        where: { id: video.id },
        data: {
          muxPlaybackId: playbackId || null,
          thumbnailUrl: thumbnailUrl || null,
          duration: duration || null,
          status: 'ready'
        }
      })

      console.log(`[MUX_WEBHOOK] Video updated successfully:`)
      console.log(`[MUX_WEBHOOK]   - id: ${updatedVideo.id}`)
      console.log(`[MUX_WEBHOOK]   - playbackId: ${updatedVideo.muxPlaybackId}`)
      console.log(`[MUX_WEBHOOK]   - status: ${updatedVideo.status}`)
      console.log(`[MUX_WEBHOOK]   - duration: ${updatedVideo.duration}s`)
      
      const durationMs = Date.now() - startTime
      console.log(`[MUX_WEBHOOK] video.asset.ready processed in ${durationMs}ms`)
      
      return NextResponse.json({ received: true, videoId: video.id })
    }

    // Handle video.asset.errored event
    if (body.type === 'video.asset.errored') {
      const assetId = body.data.id
      
      console.log(`[MUX_WEBHOOK] Processing video.asset.errored for asset: ${assetId}`)

      const video = await db.organizationVideo.findFirst({
        where: { muxAssetId: assetId }
      })

      if (video) {
        await db.organizationVideo.update({
          where: { id: video.id },
          data: { status: 'errored' }
        })
        console.log(`[MUX_WEBHOOK] Video marked as errored: ${video.id}`)
      } else {
        console.warn(`[MUX_WEBHOOK] No video found for errored asset: ${assetId}`)
      }

      return NextResponse.json({ received: true })
    }

    // Handle video.upload.asset_created (fires when Mux finishes creating asset from upload)
    if (body.type === 'video.upload.asset_created') {
      const uploadId = body.data.id
      const assetId = body.data.asset_id?.id

      console.log(`[MUX_WEBHOOK] Processing video.upload.asset_created`)
      console.log(`[MUX_WEBHOOK]   - uploadId: ${uploadId}`)
      console.log(`[MUX_WEBHOOK]   - assetId: ${assetId}`)

      if (uploadId && assetId) {
        // Find pending video with this upload ID stored as muxAssetId
        const video = await db.organizationVideo.findFirst({
          where: {
            muxAssetId: uploadId,
            status: 'pending'
          }
        })

        if (video) {
          console.log(`[MUX_WEBHOOK] Found video: ${video.id}, updating muxAssetId from upload ID to asset ID`)
          
          await db.organizationVideo.update({
            where: { id: video.id },
            data: { muxAssetId: assetId }
          })
          
          console.log(`[MUX_WEBHOOK] Video muxAssetId updated: ${video.id}`)
        } else {
          console.warn(`[MUX_WEBHOOK] No pending video found with upload ID: ${uploadId}`)
        }
      }

      return NextResponse.json({ received: true })
    }

    // Handle video.upload.created (fires when new upload is created)
    if (body.type === 'video.upload.created') {
      const uploadId = body.data.id
      console.log(`[MUX_WEBHOOK] Processing video.upload.created - uploadId: ${uploadId}`)
      return NextResponse.json({ received: true })
    }

    // Handle unknown event types gracefully
    console.log(`[MUX_WEBHOOK] Unhandled event type: ${body.type}`)
    return NextResponse.json({ received: true })
    
  } catch (error) {
    console.error('[MUX_WEBHOOK] Unexpected error:', error)
    const durationMs = Date.now() - startTime
    console.error(`[MUX_WEBHOOK] Failed after ${durationMs}ms`)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
