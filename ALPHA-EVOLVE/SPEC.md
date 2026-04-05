# SPEC.md - Mux Webhook Fix

## Root Cause Analysis

After code review, I identified **THREE issues** causing videos to stay in "Processing":

### Issue 1: Mux Webhook Secret Mismatch (Critical)
**Location:** `app/api/mux/webhook/route.ts` line 11, `lib/mux.ts` line 5

The code references `MUX_WEBHOOK_SECRET` but the environment has:
- `MUX_SIGNING_KEY_ID=placeholder_signing_key_id`
- `MUX_SIGNING_KEY=placeholder_signing_key`

Mux supports two signing methods:
1. **Webhook Secret** (simple HMAC) - requires `MUX_WEBHOOK_SECRET`
2. **Signing Keys** (asymmetric JWT) - requires `MUX_SIGNING_KEY_ID` + `MUX_SIGNING_KEY`

The code checks for `MUX_WEBHOOK_SECRET` but the infrastructure uses Signing Keys. **In production, signature verification fails silently (webhook rejected), or is bypassed entirely due to the `process.env.NODE_ENV === 'production'` check.**

### Issue 2: Race Condition Between Events (Critical)
**Location:** `app/api/mux/webhook/route.ts` lines 74-92

The flow:
1. Video created → `muxAssetId = upload.id` (upload ID, NOT asset ID)
2. User uploads to Mux
3. Mux sends `video.upload.asset_created` → updates `muxAssetId` to actual `asset_id`
4. Mux sends `video.asset.ready` → looks up by `muxAssetId` = `asset_id`

**Problem:** In production, `video.asset.ready` may fire BEFORE `video.upload.asset_created` (Mux documents these can arrive out of order). When `video.asset.ready` fires, `muxAssetId` is still the upload ID, not the asset ID, so the lookup fails.

### Issue 3: Video Created Without Valid Mux Asset ID (Medium)
**Location:** `app/api/organizations/[id]/videos/route.ts` lines 82-85

```typescript
muxAssetId: upload.asset_id || upload.id
```

When `upload.asset_id` is null (pre-processing), the upload ID is stored. This creates a window where the database doesn't know the final asset ID until `video.upload.asset_created` fires.

---

## Fix Approach

### Fix 1: Add Robust Lookup in `video.asset.ready`
When `video.asset.ready` fires, look up video by:
1. First try: `muxAssetId = body.data.id` (direct asset ID match)
2. Fallback: Look up by any video in same org with matching upload ID pattern or status

Actually, the cleaner fix: **Store the upload ID separately or track upload IDs separately.**

### Fix 2: Handle Both Event Orderings
- When `video.asset.ready` fires, if we don't find by asset ID, try to find by upload ID (stored in a separate field or via a lookup table)
- Or: Update `muxAssetId` to asset ID when `video.upload.asset_created` fires, then immediately mark as ready if processing is done

### Fix 3: Fix Signature Verification
- If using Signing Keys (current setup), implement proper JWT signature verification
- Or: Add `MUX_WEBHOOK_SECRET` to environment and use simple HMAC verification

### Fix 4: Add Comprehensive Logging
Add logging before/after each database operation to diagnose where failures occur.

---

## Files That Need to Change

| File | Changes |
|------|---------|
| `app/api/mux/webhook/route.ts` | 1. Fix signature verification to use Signing Keys OR add MUX_WEBHOOK_SECRET<br>2. Handle `video.asset.ready` more robustly (try multiple lookup strategies)<br>3. Add detailed logging<br>4. Handle edge case where upload ID was stored but asset ID arrives first |
| `prisma/schema.prisma` | Consider adding `muxUploadId` field to `OrganizationVideo` model to track upload ID separately from asset ID |
| `app/api/organizations/[id]/videos/route.ts` | Already stores `upload.asset_id \|\| upload.id` - may need adjustment |

---

## Testing Approach

### 1. Local Testing
```bash
# Use ngrok to expose local server
ngrok http 3000

# Set webhook URL in Mux dashboard to ngrok URL

# Send test webhook manually:
curl -X POST http://localhost:3000/api/mux/webhook \
  -H "Content-Type: application/json" \
  -H "mux-signature: test" \
  -d '{"type":"video.asset.ready","data":{"id":"test-asset-123","playback_ids":[{"id":"playback-123"}]}}'
```

### 2. Add Debug Endpoint
Create a debug endpoint that lists recent webhook events and video status for diagnosis.

### 3. Vercel Deployment Testing
After fix, deploy and test with real Mux webhook by uploading a video.

### 4. Checklist
- [ ] Verify webhook URL in Mux dashboard is `https://habithletics-redesign-evolve.vercel.app/api/mux/webhook`
- [ ] Verify signing key configuration matches between code and Mux dashboard
- [ ] Test with real video upload end-to-end
- [ ] Add monitoring/logging to catch future issues

---

## Recommended Immediate Fix

The quickest fix is to update `video.asset.ready` handler to:

1. **Look up by asset ID directly** (new behavior)
2. **If not found, look up by any pending video in the organization** (fallback for race condition)
3. **Log all lookup attempts** for diagnostics

And add `MUX_WEBHOOK_SECRET` to environment and switch to simple HMAC verification, which is easier to debug.

---

## Status Flow Reference

```
pending → [video.upload.asset_created] → processing/pending (with asset_id)
pending → [video.asset.ready] → ready (if asset_id matches)
pending → [video.asset.errored] → errored
```
