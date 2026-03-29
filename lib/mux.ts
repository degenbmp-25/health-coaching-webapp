import Mux from '@mux/mux-node';

const muxClient = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
  jwtSigningKey: process.env.MUX_SIGNING_KEY_ID,
  jwtPrivateKey: process.env.MUX_SIGNING_KEY,
});

export const mux = muxClient;

/**
 * Get a signed playback URL for a Mux asset
 * The Mux client is configured with signing keys at initialization
 */
export async function getSignedPlaybackUrl(playbackId: string, expiration = '1h') {
  const token = await muxClient.jwt.signPlaybackId(playbackId, {
    expiration,
  });
  
  return `https://stream.mux.com/${playbackId}.m3u8?token=${token}`;
}

/**
 * Get an upload URL for direct browser uploads
 * Trainers use this to upload videos
 */
export async function createUploadUrl() {
  const upload = await muxClient.video.uploads.create({
    new_asset_settings: {
      playback_policy: ['signed'],
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
  await muxClient.video.assets.delete(assetId);
}
