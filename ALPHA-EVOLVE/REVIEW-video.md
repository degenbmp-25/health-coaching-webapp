# REVIEW - Loop 7: Video Rendering Fix

**Reviewer:** Reviewer Agent
**Date:** 2026-03-31
**Files Reviewed:**
- `components/workout/mux-player.tsx`
- `components/workout/sheets-workout-view.tsx`

---

## SPEC Compliance Checklist

| Requirement | Status | Notes |
|---|---|---|
| Fix 1: Sequential lookup with error handling | ✅ PASS | `for...of` loop replaces `Promise.all`, HTTP status check added, try/catch with continue |
| Fix 2: Loading state in VideoPlayer | ✅ PASS | `isLoading` state added, spinner overlay renders on both MuxPlayer and fallback paths |
| Fix 3: Empty playbackId guard | ✅ PASS | Changed to `if (!playbackId \|\| playbackId.trim() === '')` |
| Fix 4: hls.js imported | ✅ PASS | `import Hls from 'hls.js'` added |
| Fix 4: hls.js actually wired up | ⚠️ PARTIAL | Hls imported but NOT instantiated — no `useEffect` that calls `Hls.isSupported()` / `new Hls()` |
| Direct file fallback (SPEC Fix 1) | ✅ PASS | `<video src={/media/videos/${exercise.videoUrl}}>` added in sheets-workout-view.tsx |

---

## Detailed Findings

### ✅ mux-player.tsx — Empty playbackId Guard

```tsx
if (!playbackId || playbackId.trim() === '') {
```

Correctly upgraded from `if (!playbackId)` to include empty string check. Returns a clean "No video available" state.

### ✅ mux-player.tsx — Loading State

`isLoading` state is added and the spinner overlay appears on both the MuxPlayer path AND the fallback path. The `onLoadedData` and `onCanPlay` handlers correctly set `isLoading = false`.

**Issue found:** The loading state never transitions to `false` if MuxPlayer errors before loading data. If `onError` fires before `onLoadedData`/`onCanPlay`, the spinner will remain indefinitely. Should reset loading on error:

```tsx
onError={() => { setHasError(true); setIsLoading(false); }}
```

### ⚠️ mux-player.tsx — HLS.js Not Actually Used

The SPEC says to add an effect like:

```tsx
useEffect(() => {
  const video = document.getElementById(`video-${playbackId}`);
  if (Hls.isSupported()) {
    const hls = new Hls();
    hls.loadSource(video.src);
    hls.attachMedia(video);
    return () => hls.destroy();
  }
}, [streamUrl, useFallback, hasError]);
```

The import is present but the useEffect hook is **absent**. The fallback `<video>` still uses `<source src={streamUrl} type="application/x-mpegURL" />` which mobile Safari and Android Chrome cannot play natively. However, this is a **low-risk gap** because the direct file fallback in `sheets-workout-view.tsx` serves MP4/MOV files (not HLS), and the MuxPlayer path handles HLS via Mux's own player.

### ✅ sheets-workout-view.tsx — Sequential Lookup

```tsx
for (const videoUrl of uniqueVideoUrls) {
  try {
    const res = await fetch(...)
    if (!res.ok) { console.warn(...); continue; }
    const json = await res.json()
    if (json.muxPlaybackId) { muxMap.set(videoUrl, json.muxPlaybackId) }
  } catch (e) {
    console.warn(...)
  }
}
```

Properly sequential, proper error handling with `continue` (doesn't abort entire loop), HTTP status check added. This is a significant improvement over the silent-failure `Promise.all` approach.

### ✅ sheets-workout-view.tsx — Direct File Fallback

When `muxId` is falsy and the videoUrl is a local filename (not HTTP), it now renders:

```tsx
<video src={`/media/videos/${exercise.videoUrl}`} ... />
```

This directly solves the italic text problem: instead of falling through to MuxPlayer with an invalid/null playbackId (which caused MuxPlayer to show italic text), it now serves the local video file directly.

### ⚠️ sheets-workout-view.tsx — Error Div Classes

```tsx
<div className="hidden items-center gap-2 text-sm text-amber-500">
```

Uses Tailwind `hidden`/`flex` toggled via inline styles. This is fragile — if the error div is never shown due to a DOM ordering issue, the user gets no feedback. A cleaner approach would use React state (e.g., `videoError` state in the local callback). Low severity since this only triggers on actual failure.

---

## Lint Results

```
npm run lint → ✅ PASS (0 errors)
```

Only pre-existing warnings in unrelated files:
- `app/admin/organizations/[id]/page.tsx` — `<img>` without alt prop (unrelated)
- `app/trainer/clients/[id]/page.tsx` — same
- `app/trainer/clients/page.tsx` — same
- `components/pages/dashboard/todays-activities.tsx` — missing useEffect dependency (unrelated)

The modified files (`mux-player.tsx`, `sheets-workout-view.tsx`) are lint-clean.

---

## Does It Solve the Problem?

**YES** — with one caveat.

The primary bug (italic text `*book opener.MOV*`) is fixed by the direct file fallback. When the Mux lookup fails or returns nothing, the app now renders an actual `<video>` element pointing to `/media/videos/book opener.MOV` instead of passing a null playbackId to MuxPlayer.

The sequential lookup change also means lookups are more robust and won't silently swallow errors.

---

## Quality Score: **7 / 10**

Deductions:
- **-1**: HLS.js imported but never used in fallback path (not critical since fallback serves direct MP4, but incomplete per SPEC)
- **-1**: Loading spinner can get stuck on error (edge case, but poor UX)
- **-1**: Error div for video fallback uses fragile class-toggle approach

---

## Remaining Issues

| Priority | Issue | File |
|---|---|---|
| Low | HLS.js useEffect hook missing — import exists but `Hls.isSupported()` never called | `mux-player.tsx` |
| Low | Loading spinner stuck forever if MuxPlayer errors before canplay/loadeddata | `mux-player.tsx` |
| Low | Error div for video fallback uses class toggle instead of React state | `sheets-workout-view.tsx` |
| Info | Videos must be placed in `/public/media/videos/` directory for fallback to work | Infrastructure |

---

## Production Ready?

**CONDITIONAL YES**

The fix solves the core issue. Local video files in `/public/media/videos/` will play correctly via HTML5 video fallback. The HLS.js gap is non-blocking because:
1. The MuxPlayer path (for cloud-hosted HLS) uses Mux's own player, which handles HLS internally
2. The direct file fallback serves MP4/MOV files, not HLS streams

**Recommended before prod:**
1. Add HLS.js useEffect to mux-player.tsx for the fallback path (completeness)
2. Fix loading spinner stuck-on-error: add `setIsLoading(false)` in `onError` handler
3. Verify `/public/media/videos/` directory exists and contains the MOV files, OR configure a media server/CDN for these files
4. Test on actual iOS Safari and Android Chrome to confirm playback
