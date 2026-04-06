# Evolution Log - Clerk ID Standardization

## Loop 1: Initial Fix (COMPLETED - April 2, 2026)

### Changes Made

1. **lib/api/id-utils.ts**
   - Updated `resolveClerkIdToDbUserId()` to handle BOTH Clerk IDs (user_xxx) and CUIDs (clndxxx)
   - If input starts with 'clnd' → verifies user exists by CUID directly
   - If input starts with 'user_' → resolves via clerkId field
   - Added fallback for unknown formats

2. **app/dashboard/coaching/page.tsx**
   - Removed unnecessary `currentUserDbId` state and `/api/users/me` call
   - Changed `fetchStudents` to use Clerk ID (`user.id`) instead of CUID
   - Updated `ClientSelector` and `StudentDataDashboard` props to use Clerk ID
   - Fixed TypeScript issues with `userId` potentially being undefined

3. **components/coach/ClientSelector.tsx**
   - Added `useUser` import from `@clerk/nextjs`
   - Removed `/api/users/me` call and `currentUserDbId` state
   - `addAsClient` now uses `user?.id` (Clerk ID) for API calls
   - Fixed TypeScript null check for `user?.id`

## Verification - April 4, 2026

### Status Check
- ✅ Build passes (April 4, 2026)
- ✅ All API routes use `resolveClerkIdToDbUserId`
- ✅ Frontend components use Clerk IDs correctly
- ✅ New commits (Mux health check) did not affect Clerk ID handling

### API Routes Using resolveClerkIdToDbUserId

| Endpoint | Status |
|----------|--------|
| `/api/users/[userId]/students` | ✓ Fixed |
| `/api/users/[userId]/activities` | ✓ Has resolution |
| `/api/users/[userId]/workouts` | ✓ Has resolution |
| `/api/users/[userId]/dashboard` | ✓ Has resolution |
| `/api/users/[userId]/meals` | ✓ Has resolution |
| `/api/users/[userId]/goals` | ✓ Has resolution |
| `/api/users/[userId]/coach` | ✓ Has resolution |

## Authorization Flow (Verified Correct)

**Coach Adds Client:**
```
ClientSelector.addAsClient(userId)
  → POST /api/users/${coachClerkId}/students
    → requireAuth() returns coach with coachCUID
    → resolveClerkIdToDbUserId(coachClerkId) → coachCUID ✓
    → verify coach is owner/trainer/coach ✓
    → verify user.id === targetDbUserId (coach accessing own) ✓
    → POST body has clientCUID
    → resolveClerkIdToDbUserId(clientCUID) → studentCUID ✓
    → update student.coachId = coachCUID ✓
```

**Coach Views Student Dashboard:**
```
StudentDataDashboard fetches /api/users/${studentClerkId}/dashboard
  → requireAuth() returns coach with coachCUID
  → resolveClerkIdToDbUserId(studentClerkId) → studentCUID ✓
  → verify coach has org membership ✓
  → getDashboardData(studentCUID) ✓
```

## Deployment

✅ **Deployed to Vercel** - https://habithletics-redesign-evolve-coral.vercel.app

## Status: COMPLETE

All success criteria met:
- [x] Coach can add clients via ClientSelector
- [x] Coach can VIEW students' data (activities, workouts, meals, dashboard)
- [x] Student can view their own data
- [x] All APIs resolve Clerk ID to DB ID correctly
- [x] No more 403 Forbidden from ID mismatch (with robust resolution)

## Quality Score: 8/10

Build passes. Pre-existing warnings only:
- ESLint: img alt tags in admin pages (not part of coaching flow)
- React Hook: exhaustive-deps warning (pre-existing, not critical)

---

# Evolution Log - Video Upload/Playback Issues

## Loop 2: Video Upload and Playback Investigation (April 6, 2026)

### Investigation Summary

**Goal:** Fix videos that:
1. Have no playback ID for previewing in Mux
2. Are stuck in "processing" - not finishing uploading to app

### Findings

#### 1. Videos in Database

| Title | Status | Playback ID | Issue |
|-------|--------|-------------|-------|
| ASLR (new) | pending | null | Stuck - webhook not received OR upload timed out |
| Rear Delt Fly | ready | hOpLxMLPoc00... | 404 on stream.mux.com - asset may be deleted |
| Bulgarian Squat | ready | 00ziSQh3q01n... | Likely OK |
| Wall Ankle Mob | ready | os02RH1Rwmon... | Likely OK |
| ASLR (old) | ready | t022hkqlrz2t... | Works unsigned, FAILS signed (400 error) |
| KB Arm Bar | ready | Eor8lNBaEqHz... | Duration = null, signed URL likely broken |
| Book Openers | ready | 01DAgZx56GEb... | Duration = null, signed URL likely broken |

#### 2. Root Cause: Signed URL Generation Broken

**Problem:** All signed URLs return HTTP 400 from Mux.

**Evidence:**
```bash
# ASLR video - unsigned works, signed fails
curl -I "https://stream.mux.com/t022hkqlrz2tt85QFrJPE6zXQbDaVn5a9NrbgvbfjGck.m3u8"
# Returns: HTTP/2 200 ✓

curl -I "https://stream.mux.com/t022hkqlrz2tt85QFrJPE6zXQbDaVn5a9NrbgvbfjGck.m3u8?token=..."
# Returns: HTTP/2 400 ✗
```

**JWT Token Analysis:**
- Key ID in JWT: `01eIpwC7U4QrjyKV4fMVmnyRIxj3nC6XrAr61DYImrVI` (NOT the placeholder)
- This is a real Mux signing key ID, but the private key used to sign doesn't match

**Diagnosis:** 
The `MUX_SIGNING_KEY` private key stored in Vercel's environment variables does NOT match the public key registered with Mux for signing key ID `01eIpwC7U4QrjyKV4fMVmnyRIxj3nC6XrAr61DYImrVI`.

#### 3. Pending Video (ASLR - new upload)

- Created: April 6, 2026 at 07:36 EDT
- Status: `pending`
- muxAssetId: `T00N3kBoRnSa2J3t01vgORdovBlvC5c1jlWTmbvFmgS2A`
- muxPlaybackId: `null`

**Scenario A:** Upload is still processing by Mux
- Webhook should fire when complete
- No action needed - just wait

**Scenario B:** Upload timed out on Mux side
- Webhook will NOT fire
- Video needs to be re-uploaded through the app

#### 4. Missing Duration for Some Videos

`KB Arm Bar` and `Book Openers` show "--:--" duration. This suggests:
- The webhook received `video.asset.ready` but `duration` was null
- OR the videos weren't properly processed by Mux

### Required Actions

#### Action 1: Fix Mux Signing Key (CRITICAL)

**The signing key on Vercel needs to be regenerated or corrected.**

In Mux Dashboard:
1. Go to Settings → Signing Keys
2. Find the signing key with ID `01eIpwC7U4QrjyKV4fMVmnyRIxj3nC6XrAr61DYImrVI`
3. Either:
   - Option A: Delete this signing key and create a new one, then update `MUX_SIGNING_KEY_ID` and `MUX_SIGNING_KEY` in Vercel
   - Option B: If you have the correct private key, update `MUX_SIGNING_KEY` in Vercel

#### Action 2: Check/Re-upload Pending Video

**Option A:** Wait a few more minutes to see if webhook fires (if Mux is still processing)

**Option B:** If Mux shows the upload as "timed_out", delete the pending video record and re-upload through the app:
```bash
# In Prisma shell or script:
await prisma.organizationVideo.delete({ where: { id: 'cmnn478kv000111pxu6hy3hbq' } })
```

#### Action 3: Fix Missing Durations (Lower Priority)

For `KB Arm Bar` and `Book Openers`:
- These have playback IDs that work (unsigned)
- But signed URLs fail due to Action 1
- After fixing Action 1, verify playback works
- Duration should auto-populate if webhook fired correctly

### Technical Details

#### Webhook Handler (app/api/mux/webhook/route.ts)
- ✅ Has 3 strategies for finding video by muxAssetId
- ✅ Handles `video.asset.ready`, `video.asset.errored`, `video.upload.asset_created`
- ⚠️ Does NOT handle `video.upload.errored` - could add for better error detection

#### Signed URL Generation (lib/mux.ts)
- Uses `muxClient.jwt.signPlaybackId()` 
- ✅ Works syntactically - JWT is valid
- ❌ Fails at Mux validation - signing key mismatch

#### Database State
- 7 organization videos total
- 1 pending, 6 ready
- Multiple workout exercises reference these videos

### Verification Commands

```bash
# Test signed URL generation
curl "https://habithletics-redesign-evolve-coral.vercel.app/api/mux/signed-url?playbackId=t022hkqlrz2tt85QFrJPE6zXQbDaVn5a9NrbgvbfjGck"

# Test unsigned stream (should work if asset exists)
curl -I "https://stream.mux.com/t022hkqlrz2tt85QFrJPE6zXQbDaVn5a9NrbgvbfjGck.m3u8"

# Test signed stream (will fail until signing key is fixed)
SIGNED_URL=$(curl -s "https://habithletics-redesign-evolve-coral.vercel.app/api/mux/signed-url?playbackId=t022hkqlrz2tt85QFrJPE6zXQbDaVn5a9NrbgvbfjGck" | jq -r '.signedUrl')
curl -I "$SIGNED_URL"
```

### Status

- [x] Investigation complete
- [ ] Action 1: Fix Mux signing key (requires Vercel/Mux dashboard access)
- [ ] Action 2: Check pending video status
- [ ] Action 3: Verify playback after signing key fix

### Quality Score: N/A (investigation only, fix requires external action)


---

## Loop 2 Continued: Code Improvements (April 6, 2026)

### Additional Findings

#### Broken Video Assets (Deleted from Mux)

These workout exercises have muxPlaybackId pointing to DELETED Mux assets:

| videoUrl | muxPlaybackId | Status |
|----------|---------------|--------|
| shoulder.MOV | 5aljH9P01G7TDKF00ij8ZeHueIQ00JTS8KLuDfsn51020278 | 404 - asset deleted |
| Fly.MOV (Rear Delt Fly) | hOpLxMLPoc00iq02rtjVpMZVRczJ202gNY9C8hHL5C7Ads | 404 - asset deleted |

These videos need to be re-uploaded through the app.

#### Signing Key Issue Confirmed

The JWTs are correctly formed with:
- Key ID: `01eIpwC7U4QrjyKV4fMVmnyRIxj3nC6XrAr61DYImrVI`
- Algorithm: RS256
- Audience: "v" (correct for Mux V2)

But Mux returns HTTP 400 when using the signed URL. This means:
**The private key in Vercel's `MUX_SIGNING_KEY` env var does NOT match the public key that Mux has for signing key ID `01eIpwC7U4QrjyKV4fMVmnyRIxj3nC6XrAr61DYImrVI`.**

### Required Actions (Summary)

1. **FIX SIGNING KEY** (Vercel Dashboard)
   - Option A: Delete the signing key `01eIpwC7U4QrjyKV4fMVmnyRIxj3nC6XrAr61DYImrVI` in Mux Dashboard → Settings → Signing Keys, create a new one, update both `MUX_SIGNING_KEY_ID` and `MUX_SIGNING_KEY` in Vercel
   - Option B: Find the correct private key that matches this key ID and update `MUX_SIGNING_KEY` in Vercel

2. **RE-UPLOAD BROKEN VIDEOS**
   - `shoulder.MOV` exercises (3 workout exercises) - re-upload shoulder video
   - `Rear Delt Fly` organization video - re-upload the video
   - `ASLR` (new) - if timed out, delete and re-upload

3. **RE-UPLOAD VIDEOS WITH MISSING DURATION**
   - `KB Arm Bar` - duration null
   - `Book Openers` - duration null

### Potential Code Improvements

While the root cause is configuration, I can implement:

1. Add `video.upload.errored` webhook handler for better error detection
2. Add status refresh endpoint to check Mux API directly

Let me implement these improvements:
