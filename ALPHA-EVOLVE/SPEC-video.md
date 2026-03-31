# SPEC - Loop 7: Video Rendering Issue

**Date:** 2026-03-31
**Architect:** Architect Agent
**Status:** READY FOR BUILDER

---

## Root Cause Analysis

### The Italic Text Problem

The user sees italic text `*book opener.MOV*` instead of a video player. After tracing the entire rendering chain, here is what happens:

1. `sheets.ts` `extractVideoUrl()` extracts `"book opener.MOV"` from the exercise notes
2. This becomes `exercise.videoUrl`
3. In `loadWorkouts()`, the component fetches `muxPlaybackIds` via `/api/mux/lookup?videoUrl=book opener.MOV`
4. The lookup API does fuzzy matching: DB has `"opener.MOV"`, sheets has `"book opener.MOV"`
   - `sheetsCoreName = "book opener"`, `dbCoreName = "opener"`
   - `"book opener".includes("opener")` → TRUE → match found
   - So the lookup **SHOULD** return a playbackId
5. BUT — the lookup is done via `Promise.all()` on all unique videoUrls, and each lookup is fire-and-forget with no error handling in the outer catch. If the lookup API is slow, throws, or returns a non-JSON response, the error is silently swallowed.
6. Additionally, the conditional in `sheets-workout-view.tsx` line 300:

```tsx
{muxPlaybackIds.get(exercise.videoUrl) ? (
  <VideoPlayer playbackId={muxPlaybackIds.get(exercise.videoUrl)!} title={exercise.name} />
) : exercise.videoUrl.startsWith('http') ? (
  <a ...> {/* external link */} </a>
) : (
  <span className="text-sm text-amber-500 truncate">Video needs migration: {exercise.videoUrl}</span>
)}
```

If `muxPlaybackIds.get("book opener.MOV")` returns `undefined` (lookup failed/slow), the condition is falsy → falls through to the `else` branch showing `"Video needs migration: book opener.MOV"`.

**The italic text `*book opener.MOV*` suggests the MuxPlayer component, when given an invalid/null playbackId, renders the `playbackId` prop as italic text internally (MuxPlayer has built-in fallback UI).** This is a secondary symptom: the playbackId being passed is empty/null/undefined, OR MuxPlayer itself is erroring and showing its internal text fallback.

### Secondary Issue: Mobile HLS Playback

Even when a valid `playbackId` IS passed, the HTML5 `<video>` fallback uses HLS (`.m3u8`) directly:

```tsx
<source src={streamUrl} type="application/x-mpegURL" />
```

Mobile Safari (iOS) and Android Chrome **do not support HLS natively via `<video>`**. This requires an HLS polyfill library like `hls.js`.

### Tertiary Issue: No Loading/Error State for VideoPlayer

The `VideoPlayer` component has no loading state. When `muxPlaybackIds.get()` returns a valid ID but MuxPlayer is initializing, there's a blank flash before the player appears.

---

## Proposed Fix

### Fix 1: Robust Mux Lookup with Better Error Handling and Fallback Logic

**File:** `components/workout/sheets-workout-view.tsx`

**Problem:** Lookup errors are silently swallowed. If lookup fails, no video renders even if a valid playbackId exists.

**Change the lookup loop to:**
1. Sequential (not parallel) to avoid overwhelming the API
2. With proper error handling that doesn't break the whole map
3. Add a **fallback check**: if `muxPlaybackIds.get(videoUrl)` is falsy but `videoUrl` matches a pattern like `"*.MOV"` or `"*.MP4"` (not an HTTP URL), still attempt to use the videoUrl as a direct file URL in an HTML5 `<video>` player

**Code change:**
```tsx
// Replace Promise.all with sequential await + fallback
for (const videoUrl of uniqueVideoUrls) {
  try {
    const res = await fetch(`/api/mux/lookup?videoUrl=${encodeURIComponent(videoUrl)}`)
    const json = await res.json()
    if (json.muxPlaybackId) {
      muxMap.set(videoUrl, json.muxPlaybackId)
    }
  } catch (e) {
    console.warn(`Mux lookup failed for ${videoUrl}:`, e)
  }
}
```

Also, in the video rendering section (around line 300), **add a direct file fallback** when Mux lookup fails but we have a video filename (non-HTTP URL):

```tsx
{(() => {
  const muxId = muxPlaybackIds.get(exercise.videoUrl);
  if (muxId) {
    return <VideoPlayer playbackId={muxId} title={exercise.name} />;
  }
  if (exercise.videoUrl.startsWith('http')) {
    return (
      <a href={exercise.videoUrl} target="_blank" rel="noopener noreferrer" className="...">
        <Icons.externalLink className="h-4 w-4 shrink-0" />
        <span className="truncate">{exercise.videoUrl}</span>
      </a>
    );
  }
  // Fallback: render as HTML5 video with direct file URL (for local files like "book opener.MOV")
  // These are videos stored in the public/media folder
  return (
    <video
      controls
      playsInline
      preload="metadata"
      className="w-full rounded-md"
      src={`/media/videos/${exercise.videoUrl}`}
      onError={(e) => {
        // If video fails to load, show error message
        const target = e.currentTarget;
        target.style.display = 'none';
        target.nextSibling && ((target.nextSibling as HTMLElement).style.display = 'flex');
      }}
    >
      Your browser does not support video playback.
    </video>
  );
})()}
```

**NOTE:** This requires that local video files be served from `/public/media/videos/` directory. If they don't exist there, the video will show an error.

---

### Fix 2: Add Loading State to VideoPlayer

**File:** `components/workout/mux-player.tsx`

The MuxPlayer takes time to initialize. Add a loading skeleton:

```tsx
const [isLoading, setIsLoading] = useState(true);

<MuxPlayer
  playbackId={playbackId}
  metadata={{ video_title: title, viewer_user_id: 'workout-user' }}
  streamType="on-demand"
  className={className}
  primaryColor="#f97316"
  secondaryColor="#1e293b"
  onError={() => setHasError(true)}
  onLoadedData={() => setIsLoading(false)}
  onCanPlay={() => setIsLoading(false)}
/>

{isLoading && (
  <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
    <Icons.clock className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
)}
```

---

### Fix 3: Guard VideoPlayer.playbackId Against Empty String

**File:** `components/workout/mux-player.tsx`

The current check `if (!playbackId)` handles `null`/`undefined` but NOT empty string `""`. An empty string is falsy but could slip through if the map stores `""` as a value.

```tsx
// Change:
if (!playbackId) {
// To:
if (!playbackId || playbackId.trim() === '') {
```

---

### Fix 4: HLS Support for HTML5 Fallback

**File:** `components/workout/mux-player.tsx`

For the HTML5 fallback, add `hls.js` support for mobile browsers that don't natively support HLS:

```bash
npm install hls.js
```

```tsx
import Hls from 'hls.js';

// Inside the fallback <video>:
useEffect(() => {
  const video = document.getElementById(`video-${playbackId}`);
  if (!video || !video.src) return;
  
  if (Hls.isSupported()) {
    const hls = new Hls();
    hls.loadSource(video.src);
    hls.attachMedia(video);
    return () => hls.destroy();
  }
  // For Safari iOS native HLS (doesn't need hls.js)
}, [streamUrl, useFallback, hasError]);
```

---

## Files to Modify

1. **`components/workout/mux-player.tsx`** — Fix empty playbackId guard, add loading state, add hls.js fallback
2. **`components/workout/sheets-workout-view.tsx`** — Fix sequential lookup, add direct-file fallback for local videos

---

## Why This Will Solve the Problem

1. **Lookup robustness**: Sequential await with proper error handling ensures the lookup doesn't silently fail. If the API is slow or throws, the fallback still works.

2. **Direct file fallback**: Even if Mux lookup returns nothing, the app will try to serve the video from `/media/videos/{filename}` as a direct MP4/MOV file. This works on mobile without HLS.

3. **Empty playbackId guard**: Prevents MuxPlayer from being passed an empty string, which could cause it to error and show text fallback.

4. **Loading state**: User sees feedback while video initializes, reducing perceived "brokenness."

5. **HLS polyfill**: If the HLS stream is used as fallback, `hls.js` enables playback on mobile Chrome/Android.

---

## Success Criteria

- [ ] Video files like `book opener.MOV` render as playable video (not italic text)
- [ ] MuxPlayer renders when `muxPlaybackId` is found
- [ ] Direct file fallback renders when Mux lookup fails but local file exists
- [ ] Loading indicator shows while video initializes
- [ ] No italic text visible in place of video player
- [ ] Videos play on mobile browsers (iOS Safari, Android Chrome)
