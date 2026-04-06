# Alpha-Evolve: Mux Video Processing - MUST BE WORKING

**Issue:** Videos uploaded via the app stay in "Processing" status forever. Even after the webhook fix, a test video uploaded on April 5 is STILL stuck in "Processing" after 24+ hours.

**CRITICAL:** This loop does NOT stop until the video shows as "Ready" in the library.

## Investigation Steps

1. First, check the webhook logs in Vercel for any `[MUX_WEBHOOK]` entries
2. Check Mux dashboard directly to see if the video is marked as ready on Mux's side
3. Check the database to see if there's any record of the webhook firing
4. Check if the webhook URL is correctly configured in Mux dashboard

## Root Causes to Check

1. **Webhook not configured in Mux** - The Mux dashboard needs the webhook URL set
2. **Webhook not reaching our server** - Network/firewall issues
3. **Webhook reaches server but fails** - Signature verification or other errors
4. **Database not updating** - The webhook handler isn't updating the status
5. **Wrong event type** - Mux might be firing a different event than we handle

## Testing Approach

1. Upload a new test video via `/trainer/videos`
2. Monitor the webhook logs in real-time
3. Check Mux API directly for the video status
4. Check database for status updates
5. DO NOT STOP until video shows as "Ready" in the library

## Files to Investigate
- `app/api/mux/webhook/route.ts` - webhook handler
- `app/api/mux/upload-url/route.ts` - upload URL generation
- Mux dashboard webhook configuration

## Success Criteria
- Video transitions from "Processing" → "Ready" in the app
- OR we identify exactly why it's failing
