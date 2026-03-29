import { NextRequest, NextResponse } from 'next/server';
import { mux } from '@/lib/mux';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Verify Mux webhook signature
function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return signature === expectedSignature;
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('mux-signature');
    const webhookSecret = process.env.MUX_WEBHOOK_SECRET;

    // Verify signature in production
    if (process.env.NODE_ENV === 'production' && webhookSecret && signature) {
      if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const body = JSON.parse(rawBody);
    
    // Handle different webhook events
    if (body.type === 'video.asset.ready') {
      const assetId = body.data.id;
      const playbackId = body.data.playback_ids?.[0]?.id;
      
      if (!playbackId) {
        console.error('No playback ID found for asset:', assetId);
        return NextResponse.json({ error: 'No playback ID' }, { status: 400 });
      }

      // The upload ID is sent in the webhook metadata
      const uploadId = body.data.upload_id;
      
      if (uploadId) {
        // Update the WorkoutExercise with the new playback ID
        // In a real app, you'd store the upload ID in a temporary table
        // and link it here. For now, this is a placeholder.
        console.log(`Asset ready: ${assetId}, playbackId: ${playbackId}`);
        
        // TODO: Look up workout exercise by upload ID and update
        // This requires storing uploadId when creating the upload URL
      }
      
      return NextResponse.json({ received: true, assetId, playbackId });
    }

    if (body.type === 'video.asset.errored') {
      console.error('Mux asset error:', body.data);
      return NextResponse.json({ received: true, error: 'Asset errored' });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Mux webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
