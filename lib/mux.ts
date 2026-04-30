import Mux from '@mux/mux-node';

export function getMuxCredentials() {
  const tokenId = process.env.MUX_TOKEN_ID?.trim()
  const tokenSecret = process.env.MUX_TOKEN_SECRET?.trim()
  const jwtSigningKey = process.env.MUX_SIGNING_KEY_ID?.trim()
  const jwtPrivateKey = process.env.MUX_SIGNING_KEY?.trim()

  return {
    tokenId,
    tokenSecret,
    jwtSigningKey,
    jwtPrivateKey,
  }
}

function createMuxClient({ requireSigning = false } = {}) {
  const { tokenId, tokenSecret, jwtSigningKey, jwtPrivateKey } = getMuxCredentials()

  if (!tokenId || !tokenSecret) {
    throw new Error('Mux credentials are not configured')
  }

  if (requireSigning && (!jwtSigningKey || !jwtPrivateKey)) {
    throw new Error('Mux signing keys are not configured')
  }

  return new Mux({
    tokenId,
    tokenSecret,
    jwtSigningKey,
    jwtPrivateKey,
  });
}

/**
 * Get a signed playback URL for a Mux asset
 * The Mux client is configured with signing keys at initialization
 */
export async function getSignedPlaybackUrl(playbackId: string, expiration = '1h') {
  const muxClient = createMuxClient({ requireSigning: true });
  const token = await muxClient.jwt.signPlaybackId(playbackId, {
    expiration,
  });
  
  return `https://stream.mux.com/${playbackId}.m3u8?token=${token}`;
}

async function getPlaybackPolicy(playbackId: string) {
  const muxClient = createMuxClient()
  const playback = await muxClient.video.playbackIds.retrieve(playbackId)

  return playback.policy
}

export async function getPlaybackUrl(playbackId: string, expiration = '1h') {
  const policy = await getPlaybackPolicy(playbackId)

  if (policy !== 'signed') {
    return `https://stream.mux.com/${playbackId}.m3u8`
  }

  return getSignedPlaybackUrl(playbackId, expiration)
}

export async function getThumbnailUrl(playbackId: string, expiration = '1h') {
  const policy = await getPlaybackPolicy(playbackId)
  const thumbnailUrl = `https://image.mux.com/${playbackId}/thumbnail.jpg`

  if (policy !== 'signed') {
    return thumbnailUrl
  }

  const muxClient = createMuxClient({ requireSigning: true })
  const token = await muxClient.jwt.signPlaybackId(playbackId, {
    type: 'thumbnail',
    expiration,
  })

  return `${thumbnailUrl}?token=${token}`
}

/**
 * Get an upload URL for direct browser uploads
 * Trainers use this to upload videos
 */
export async function createUploadUrl() {
  const muxClient = createMuxClient();
  const upload = await muxClient.video.uploads.create({
    new_asset_settings: {
      playback_policy: ['public'],
      encoding_tier: 'baseline',
    },
    cors_origin: process.env.NEXT_PUBLIC_APP_URL || '*',
  });

  return {
    uploadId: upload.id,
    uploadUrl: upload.url,
  };
}

/**
 * Get asset by upload ID
 */
export async function getAssetByUploadId(uploadId: string) {
  const muxClient = createMuxClient();
  const upload = await muxClient.video.uploads.retrieve(uploadId);
  
  if (upload.status !== 'asset_created' || !upload.asset_id) {
    return null;
  }

  const asset = await muxClient.video.assets.retrieve(upload.asset_id);
  
  return {
    assetId: asset.id,
    playbackId: asset.playback_ids?.[0]?.id,
    status: asset.status,
  };
}

/**
 * Delete a Mux asset
 */
export async function deleteAsset(assetId: string) {
  const muxClient = createMuxClient();
  await muxClient.video.assets.delete(assetId);
}
