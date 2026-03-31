# Alpha-Evolve Requirements - Video Playback Fix (Loop 2)

## Project
Habithletics workout webapp

## Codebase Path
/home/magic_000/BeastmodeVault/vault/projects/habithletics-redesign-evolve

## Deployment URL
https://habithletics-redesign-evolve-coral.vercel.app

## Requirements

### CRITICAL: Video Playback
**Problem:** Videos show as italic text "*book opener.MOV*" instead of playing.

**What should happen:**
- Videos should play embedded in the workout page
- Video player should appear where exercises have video URLs

**Technical context:**
- Mux playback IDs are correct (verified - HLS stream works when accessed directly)
- Database has muxPlaybackId field populated for exercises
- The mux-player.tsx component was updated to use iframe embed
- The HLS stream URL works: `https://stream.mux.com/{playbackId}.m3u8`

**Root cause hypothesis:**
The iframe embed might not be loading properly. Need to:
1. Verify the iframe src URL is correct
2. Check if there's a CORS issue
3. Check if the embed URL format is correct for Mux iframes
4. Alternatively, try a different video approach (HTML5 video with HLS.js)

### Files to Examine
- `components/workout/mux-player.tsx` - Video player component
- `components/workout/sheets-workout-view.tsx` - Where VideoPlayer is used
- `app/api/mux/lookup/route.ts` - API that returns muxPlaybackId

### Success Criteria
- [ ] Videos play embedded in the workout page
- [ ] No showing of filenames as text
- [ ] Works on both mobile and desktop
