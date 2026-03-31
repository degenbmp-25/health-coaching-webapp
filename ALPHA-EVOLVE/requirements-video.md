# Alpha-Evolve Loop 7: Video Rendering Issue

## Issue
Videos in workouts show as italic text "*book opener.MOV*" instead of playing video.

## Expected Behavior
- User should see a playable video (MuxPlayer or HTML5 fallback)
- Video should play when user taps/clicks on it
- Mobile browsers must support the playback

## Current Behavior
- User sees italic text like "*book opener.MOV*" below exercise
- No video player is visible
- Text does not appear to be clickable as a link

## Technical Context
- Mux playback IDs are correctly stored in DB and returned by lookup API
- Mux stream URLs return HTTP 200 (verified with curl)
- VideoPlayer component renders MuxPlayer with valid playbackId
- HTML5 video fallback was added but still shows same text
- The italic text "*book opener.MOV*" appears where video should be

## Root Cause Hypothesis
MuxPlayer component receives valid playbackId but:
1. Mobile browser cannot decode/play HLS stream, OR
2. MuxPlayer has JavaScript error and shows playbackId as text fallback, OR
3. Something in the rendering chain is displaying text instead of video

## Files to Investigate
- `components/workout/mux-player.tsx` - VideoPlayer component
- `components/workout/sheets-workout-view.tsx` - Video rendering logic
- `lib/sheets.ts` - Video URL extraction

## Success Criteria
- Videos play on mobile (iOS Safari and Android Chrome)
- No italic text showing instead of video
- Fallback works if MuxPlayer fails
