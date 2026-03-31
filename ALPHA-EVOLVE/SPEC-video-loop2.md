# SPEC - Video Loop 2: Fix Video Playback (Iframe → MuxPlayer React)

**Date:** 2026-03-31
**Architect:** Architect Agent (subagent)
**Status:** READY FOR BUILDER
**Loop:** video-loop2 (alpha-evolve)

---

## Problem Statement

Videos show as italic text `*book opener.MOV*` instead of playing. The `mux-player.tsx` component uses an `<iframe>` pointing to `https://stream.mux.com/{playbackId}`, but this **cannot work** for signed Mux assets — which is what this app uses.

---

## Root Cause Analysis

### Why the iframe fails

The app creates Mux assets with a **signed playback policy** (`playback_policy: ['signed']` in `lib/mux.ts → createUploadUrl()`). Signed streams require a **JWT token** to be appended to the stream URL. The current iframe implementation:

```tsx
const embedUrl = `https://stream.mux.com/${playbackId}?autoplay=0&muted=0`;
<iframe src={embedUrl} ... />
```

This URL has **no token**, so Mux's stream server rejects the request. The iframe loads a blank page or error state — which can manifest as the italic text fallback when MuxPlayer React internally renders error text.

### Why `@mux/mux-player-react` fixes this

The official `@mux/mux-player-react` npm package (**already installed** — confirmed in `package.json`) is the **React wrapper** around Mux's player. It:

1. Automatically handles signed token generation via the Mux Data API (`MUX_TOKEN_ID` / `MUX_TOKEN_SECRET` env vars)
2. Falls back to unsigned playback for public assets
3. Provides a full-featured video player with HLS support on mobile natively
4. Is the **officially recommended** way to embed Mux videos in React

### The italic text symptom

The italic `*book opener.MOV*` text is likely the text content of the `title` prop or a MuxPlayer internal fallback being styled with `font-style: italic`. When the iframe fails to load, the component's error state bleeds through as styled text.

---

## Solution: Replace iframe with `<MuxPlayer>` React Component

### Changes Required

#### 1. `components/workout/mux-player.tsx` — Replace iframe with MuxPlayer

**Before (broken):**
```tsx
const embedUrl = `https://stream.mux.com/${playbackId}?autoplay=0&muted=0`;
return (
  <div className="rounded-md overflow-hidden border relative" style={{ aspectRatio: '16/9' }}>
    <iframe
      src={embedUrl}
      title={title || 'Workout Video'}
      allowFullScreen
      allow="autoplay; fullscreen"
      style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, border: 'none' }}
    />
  </div>
);
```

**After (fixed):**
```tsx
import MuxPlayer from '@mux/mux-player-react';

return (
  <div className="rounded-md overflow-hidden border relative" style={{ aspectRatio: '16/9' }}>
    <MuxPlayer
      playbackId={playbackId}
      metadata={{
        video_title: title || 'Workout Video',
        viewer_user_id: 'workout-app',
      }}
      streamType="on-demand"
      accentColor="#f97316"
      primaryColor="#ffffff"
      secondaryColor="#1e293b"
      style={{ width: '100%', height: '100%', borderRadius: '6px' }}
    />
  </div>
);
```

**Key MuxPlayer props explained:**
- `playbackId` — the Mux playback ID (same as before)
- `metadata` — object with `video_title` (required by Mux for analytics)
- `streamType="on-demand"` — on-demand video (not live)
- `accentColor` — orange accent matching the app's theme (`#f97316`)
- `primaryColor` / `secondaryColor` — theming for player controls

#### 2. Keep existing guard clause

The empty playbackId guard at the top of the component stays:

```tsx
if (!playbackId || playbackId.trim() === '') {
  return (
    <div className="rounded-md border bg-muted/50 p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icons.clock className="h-4 w-4" />
        <span>No video available</span>
      </div>
    </div>
  );
}
```

---

## Alternative Approaches Considered

### Option A: Keep iframe + Add server-side token generation (REJECTED)
- Would require a new API endpoint to generate signed tokens
- Adds latency (token fetch before iframe loads)
- More complex than needed — reinventing what MuxPlayer handles automatically
- **Not chosen**

### Option B: Change Mux assets to public playback policy (REJECTED)
- Would require re-uploading or migrating all existing Mux assets
- Security concern — videos would be publicly accessible with the playbackId
- **Not chosen**

### Option C: HTML5 `<video>` with HLS.js (REJECTED)
- Would require server-side token generation for signed HLS URLs
- More complex than MuxPlayer which handles this internally
- MuxPlayer is the idiomatic solution for Mux + React
- **Not chosen**

---

## Files to Modify

| File | Change |
|------|--------|
| `components/workout/mux-player.tsx` | Replace `<iframe>` with `<MuxPlayer>` from `@mux/mux-player-react` |

**No changes needed to:**
- `sheets-workout-view.tsx` — already calls `<VideoPlayer playbackId={muxId} />` correctly
- `app/api/mux/lookup/route.ts` — returns correct `muxPlaybackId`
- `lib/mux.ts` — signing keys already configured

---

## Verification Steps

1. After deploying, open a workout with a video (e.g., `book opener.MOV`)
2. The video should render as a full MuxPlayer with controls (play, pause, volume, fullscreen)
3. Video should play on both desktop and mobile (MuxPlayer handles HLS natively)
4. No italic text or filename should be visible
5. If no `muxPlaybackId` is found, the "No video available" placeholder should show (not italic text)

---

## Success Criteria

- [ ] `<MuxPlayer>` renders instead of blank iframe
- [ ] Videos play on desktop browsers
- [ ] Videos play on mobile browsers (iOS Safari, Android Chrome)
- [ ] No italic text `*book opener.MOV*` visible
- [ ] "No video available" placeholder shows when `playbackId` is empty
- [ ] App theme accent color (`#f97316` orange) used for player controls
