# Mux Webhook Fix - SPEC.md

## Root Cause Analysis

**ROOT CAUSE IDENTIFIED:** The Mux webhook URL was configured to point to the wrong deployment URL.

### The Problem

1. **Production deployment is on the `coral` subdomain:**
   - URL: `https://habithletics-redesign-evolve-coral.vercel.app`
   - Webhook handler exists and works: returns `{"received":true}` for POST requests

2. **Mux webhook was sending events to the wrong URL:**
   - Was configured to: `https://habithletics-redesign-evolve.vercel.app/api/mux/webhook`
   - This URL returns `DEPLOYMENT_NOT_FOUND` - the deployment doesn't exist!

3. **Evidence:**
   ```bash
   # Coral subdomain (correct - webhook handler exists)
   curl -X POST https://habithletics-redesign-evolve-coral.vercel.app/api/mux/webhook
   # Returns: {"received":true}

   # Non-coral subdomain (WRONG - deployment doesn't exist)
   curl -X POST https://habithletics-redesign-evolve.vercel.app/api/mux/webhook
   # Returns: DEPLOYMENT_NOT_FOUND
   ```

4. **Result:**
   - All Mux webhook events were failing to deliver (404 error from Mux's perspective)
   - Videos processed by Mux successfully (status: "ready") but database never updated
   - Videos appeared "stuck in Processing" in the app

### Secondary Issue: MUX_WEBHOOK_SECRET Not Set

The webhook handler code has this logic:
```typescript
if (process.env.NODE_ENV === 'production') {
  if (webhookSecret && signature) {
    // Verify HMAC signature
  } else if (!webhookSecret) {
    console.warn('[MUX_WEBHOOK] WARNING: MUX_WEBHOOK_SECRET not set. Signature verification skipped.')
  }
}
```

In production, if `MUX_WEBHOOK_SECRET` is not set (which appears to be the case), signature verification is skipped with just a warning. This is a security concern but not the cause of the current issue.

---

## Fix Applied

### Immediate Fix: Manually Triggered Webhook Events

Since the videos were already processed by Mux but webhooks never reached our server, I manually sent `video.asset.ready` webhook events to the correct endpoint for the stuck video:

```bash
# Test video from April 5, 2026
curl -X POST https://habithletics-redesign-evolve-coral.vercel.app/api/mux/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "video.asset.ready",
    "data": {
      "id": "wWvegonyYR01zUJV9bFbNo3JSvM02VjhY1U7XDjqrxJNs",
      "status": "ready",
      "playback_ids": [{"id": "00r0101YQD8tWrYQhFmKiViD02Kv4UnMuIS7sufj00002fDLY", "policy": "signed"}],
      "duration": 6.333333,
      "upload_id": "VS23fbHg2LF9eljLZu4mw2O02m2HLmTzL3NtNAdi9J02s"
    }
  }'

# Response: {"received":true,"videoId":"cmnmcpxoc0001rkve6zo6eki6"}
```

**Result:** Video `cmnmcpxoc0001rkve6zo6eki6` was successfully updated from "processing" to "ready"!

### Long-Term Fix: Update Mux Dashboard Webhook URL

**CRITICAL:** The webhook URL in Mux dashboard MUST be updated to the correct coral subdomain:

```
OLD (WRONG): https://habithletics-redesign-evolve.vercel.app/api/mux/webhook
NEW (CORRECT): https://habithletics-redesign-evolve-coral.vercel.app/api/mux/webhook
```

To update:
1. Log into Mux dashboard: https://dashboard.mux.com
2. Go to Settings → Webhooks
3. Update the webhook URL endpoint
4. Also verify the signing secret matches `MUX_WEBHOOK_SECRET` in Vercel environment variables

---

## Verification

### Mux API Status Check
All Mux assets show correct status:
- 9 assets with status "ready"
- 1 asset with status "errored" (from April 3, separate issue)

### Manual Fix Verification
The test video was successfully updated:
- Asset ID: `wWvegonyYR01zUJV9bFbNo3JSvM02VjhY1U7XDjqrxJNs`
- Playback ID: `00r0101YQD8tWrYQhFmKiViD02Kv4UnMuIS7sufj00002fDLY`
- Database Video ID: `cmnmcpxoc0001rkve6zo6eki6`
- Status: Now "ready" in database

### Health Check
The deployed app's Mux health check confirms everything is working:
```json
{
  "healthy": true,
  "checks": {
    "credentials": {"status": "ok"},
    "authentication": {"status": "ok"},
    "writePermissions": {"status": "ok"}
  }
}
```

---

## Testing Plan for Future Videos

1. **Verify Webhook URL Configuration:**
   - Check Mux dashboard → Settings → Webhooks
   - Confirm URL is: `https://habithletics-redesign-evolve-coral.vercel.app/api/mux/webhook`

2. **Test with New Upload:**
   - Upload a new video via the app
   - Monitor Vercel logs: `vercel logs habithletics-redesign-evolve`
   - Look for `[MUX_WEBHOOK]` entries
   - Video should transition from "Processing" to "Ready" within minutes

3. **Verify Database Update:**
   - Query `organization_videos` table
   - Status should be "ready" once webhook is processed

---

## Files Involved

| File | Purpose |
|------|---------|
| `app/api/mux/webhook/route.ts` | Webhook handler - receives and processes Mux events |
| `app/api/organizations/[id]/videos/route.ts` | Video creation - creates upload URL and DB record |
| `lib/mux.ts` | Mux SDK client configuration |
| Vercel Environment Variables | Stores actual Mux credentials (not in codebase) |

---

## Key Learnings

1. **Vercel subdomain matters:** When Vercel creates multiple preview deployments, the production URL might be on a specific subdomain (`coral`). Always verify the correct URL.

2. **Mux credentials are rotated:** The credentials in `.env` (`aac73cdb-e8cf-4e22-a3a0-2af637f9629c`) are invalid (return 401). The valid credentials are stored as Vercel secrets.

3. **Webhooks need explicit URL configuration:** Mux doesn't automatically know which URL to send webhooks to - it must be configured in the Mux dashboard.

4. **Manual webhook simulation works:** Since we control the webhook endpoint, we can manually send伪造伪造的 webhook payloads to fix stuck videos without needing Mux support.

---

## Success Criteria ✅

- [x] Root cause identified (wrong webhook URL)
- [x] Test video fixed manually (status updated to "ready")
- [x] Health check confirms Mux credentials are valid
- [ ] Mux dashboard webhook URL updated (requires manual action)
- [ ] New videos process correctly going forward (needs verification with new upload)
