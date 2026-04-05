# Alpha-Evolve: Mux Video Processing Fix

**Issue:** Videos uploaded via the app stay in "Processing" status forever. Mux webhook should update status to "ready" when processing completes, but this isn't happening.

**Root Cause Hypothesis:**
1. Mux webhook not configured or not reachable
2. Webhook signature verification failing
3. Webhook handler errors silently
4. Database not updating properly
5. Webhook URL wrong in Mux dashboard

**Requirements:**
1. Diagnose why videos stay in "Processing" state
2. Fix the webhook to properly update video status in database
3. Add logging/diagnostics to track webhook events
4. Ensure webhook URL is correctly configured
5. Add retry logic or manual status check

**Files to Investigate:**
- `app/api/mux/webhook/route.ts` - webhook handler
- `app/api/organizations/[id]/videos/[videoId]/route.ts` - video status updates
- Mux dashboard webhook configuration

**Test Scenario:**
1. Upload a video via `/trainer/videos`
2. Verify webhook fires when Mux finishes processing
3. Verify status updates from "processing" to "ready" in database
4. Verify video shows as "ready" in UI
