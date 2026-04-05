# Code Review Report

## Summary
Refactored Mux webhook handler to handle multiple event types (`video.asset.ready`, `video.asset.errored`, `video.upload.asset_created`, `video.upload.created`) with multi-strategy video lookup for the `video.asset.ready` event.

## Issues Found

### Critical (must fix before deploy)

1. **Strategy 2 is identical to Strategy 1** - `app/api/mux/webhook/route.ts:77-84`
   - Strategy 2's where clause is `{ muxAssetId: assetId, status: { in: ['pending', 'processing'] } }` — same as Strategy 1 which just looks for `{ muxAssetId: assetId }`. The comment says "find by upload ID pattern" but it doesn't actually do that. Strategy 2 should be looking for videos where `muxAssetId` equals the **upload ID** (stored before asset creation), not the asset ID.

### High (should fix)

1. **Strategy 3 is too greedy** - `app/api/mux/webhook/route.ts:90-101`
   - Finds the oldest pending video without a playback ID and assigns the incoming asset to it — with no verification that this asset actually belongs to that video. In a race condition scenario with multiple simultaneous uploads, this could assign the wrong playback ID to the wrong video.
   - Fix: Either verify the asset belongs to this video (e.g., check Mux upload ID if available) or don't use this fallback at all.

2. **Status transition is incomplete** - `app/api/mux/webhook/route.ts:103-113`
   - The handler transitions directly from `pending` → `ready` but never sets `processing`. If a user wants to track that a video is actively being processed (between upload and ready), there's no status for that. Either this is intentional (simplified flow) or `processing` status should be set in `video.upload.asset_created`.

### Medium

1. **No idempotency for `video.asset.ready`** - `app/api/mux/webhook/route.ts:103`
   - If the webhook fires twice for the same asset (Mux can do this), the second call will succeed even if the video is already `ready`. This could cause unexpected overwrites of `playbackId`, `thumbnailUrl`, etc. Consider checking `if (video.status === 'ready') return` early.

2. **Signature verification bypass in production** - `app/api/mux/webhook/route.ts:49-56`
   - If `MUX_WEBHOOK_SECRET` is not set in production, the webhook proceeds with only a `console.warn`. While there's a comment explaining this is intentional for "proper signing keys" setups, it means any party could POST fake webhook events. Ensure this is deliberate and documented.

3. **No database transaction wrapping the update** - `app/api/mux/webhook/route.ts:106`
   - The `video.asset.ready` update reads then writes without a transaction. While Prisma's update is atomic, if the logic expands (e.g., multiple updates), this could cause race conditions.

### Low

1. **Inconsistent error response codes** - The `video.asset.errored` handler returns `200` even when no video is found (just a warn log). For consistency, consider returning 404 if the video isn't found, or at least log at error level.

2. **Unused `video.upload.created` handler** - `app/api/mux/webhook/route.ts:132-134`
   - Just logs and returns. If no initialization logic is needed, this is fine, but if uploads should initialize a video record, that logic is missing.

3. **Missing `mux-upload.completed` event** - Mux also sends `video.upload.completed` when an upload finishes. If there's cleanup or state change needed at that point, it's not handled.

## Quality Score: 6/10

## Production Ready: NO

**Primary blocker:** Strategy 2 is broken (same as Strategy 1). This will cause the multi-lookup to fail in cases where the upload ID was stored as `muxAssetId` but the asset ID hasn't been linked yet.

## Recommendations

1. **Fix Strategy 2** to actually look for videos where `muxAssetId` equals the upload ID (need to track/derive upload ID from the asset webhook payload, or store upload ID separately).

2. **Consider adding a `processing` status** when `video.upload.asset_created` fires, so the state flow is `pending → processing → ready`.

3. **Add early return in `video.asset.ready`** if status is already `ready` for idempotency.

4. **Audit whether signature bypass is intentional** — if so, document why Mux's signing keys method doesn't require verification here.

5. **Add Mux's `video.upload.completed` handling** if cleanup or status updates are needed at upload completion.
