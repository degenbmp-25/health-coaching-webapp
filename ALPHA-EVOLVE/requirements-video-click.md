# Video Player Click Issue - Requirements

## Problem
Videos display as text/file names instead of being clickable/playable.

## Expected Behavior  
When a video is attached to an exercise, user should be able to:
1. Click to play the video inline
2. Video plays directly in the workout view
3. If muxPlaybackId exists, use Mux player
4. If no muxPlaybackId but has videoUrl, show playable link

## Current State
- Database has muxPlaybackId for many exercises
- sheets-workout-view.tsx fetches muxPlaybackId from /api/mux/lookup
- VideoPlayer component exists but not rendering as clickable
- 80% of videos still not uploaded to Mux (only 5 uploaded so far)

## Requirements
1. **Video must be clickable/playable** - primary issue
2. **Graceful fallback** - if no muxPlaybackId, show the videoUrl as a clickable link opening in new tab
3. **Video upload flow for trainer** - need UI to upload remaining 80% of videos
4. **Match videoUrls to exercises** - need script to match local video files to exercises in DB

## Non-Negotiables
- Must work on mobile (touch-friendly)
- Must handle missing muxPlaybackId gracefully
- Video upload must be simple for trainer (drag & drop)
