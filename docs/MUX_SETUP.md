# Mux Video Integration Setup

## 1. Create Mux Account

1. Go to [mux.com](https://www.mux.com) and sign up
2. Go to Settings → API Keys
3. Create a new Access Token (or use Default)

## 2. Get API Credentials

You'll need:
- `MUX_TOKEN_ID` - from Settings → API Keys
- `MUX_TOKEN_SECRET` - from Settings → API Keys

For signed playback, you'll also need signing keys:
1. Go to Settings → Signing Keys
2. Create a new signing key pair
3. Download the private key (`.pem` file)
4. Convert to base64 or set the raw key as `MUX_SIGNING_KEY`

## 3. Add Environment Variables

```bash
# Vercel (for production)
vercel env add MUX_TOKEN_ID
vercel env add MUX_TOKEN_SECRET
vercel env add MUX_SIGNING_KEY_ID
vercel env add MUX_SIGNING_KEY
vercel env add MUX_WEBHOOK_SECRET

# Local .env file
MUX_TOKEN_ID=your_token_id
MUX_TOKEN_SECRET=your_token_secret
MUX_SIGNING_KEY_ID=your_signing_key_id
MUX_SIGNING_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
MUX_WEBHOOK_SECRET=your_webhook_secret
```

## 4. Generate Mux Signing Key

```bash
# Generate a new signing key (only need to do once)
openssl genrsa -out private_key.pem 2048

# Get the public key ID from Mux Dashboard (Settings → Signing Keys)
```

## 5. Database Migration

After adding the env vars, run:

```bash
npx prisma migrate dev --name add_mux_fields
```

## 6. Using Mux in the App

### For Trainers (Uploading Videos)

Trainers can upload videos through the app:

```typescript
// Get an upload URL
const response = await fetch('/api/mux/upload-url', { method: 'POST' });
const { uploadId, uploadUrl } = await response.json();

// Upload the video file directly to Mux
const formData = new FormData();
formData.append('file', videoFile);
await fetch(uploadUrl, { method: 'PUT', body: formData });

// Mux will webhook to /api/mux/webhook when ready
```

### For Clients (Watching Videos)

Videos are automatically served with signed URLs:

```typescript
// The MuxPlayer component handles signing automatically
import { VideoPlayer } from '@/components/workout/mux-player';

<VideoPlayer playbackId={muxPlaybackId} title="Exercise Demo" />
```

## 7. Migrating Existing Videos

To migrate videos from Google Drive to Mux:

```bash
npx tsx scripts/migrate-videos-to-mux.ts
```

This script will:
1. Fetch videos from Google Drive
2. Upload to Mux
3. Update the database with new playback IDs

## Architecture

```
Trainer uploads video
        ↓
   App requests upload URL from /api/mux/upload-url
        ↓
   Mux returns presigned upload URL
        ↓
   Trainer uploads directly to Mux (bypasses your server)
        ↓
   Mux transcodes video
        ↓
   Mux sends webhook to /api/mux/webhook
        ↓
   App stores playback ID in database
        ↓
Client watches video
        ↓
   App generates signed playback URL from /api/mux/playback/[id]
        ↓
   Mux Player streams video (signed URLs = access control)
```

## Pricing

- **Free tier**: 100,000 minutes per month
- **Storage**: ~$0.0024 per minute per month
- **Delivery**: Included in free tier (first 100K mins)

For 50 clients watching 5 hours/month:
- Storage: ~1,500 mins × $0.0024 = ~$3.60/mo
- Delivery: Likely under free tier limit

## Notes

- Videos are only accessible via signed URLs
- URLs expire after 1 hour (configurable)
- Mux handles all transcoding and CDN distribution
- No video files stored on your servers
