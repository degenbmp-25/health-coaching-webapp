# Review Report - Video Loop 2

## CRITICAL Issues
- **None**

## HIGH Issues

1. **Hardcoded `viewer_user_id`**
   - `viewer_user_id: 'workout-app'` is a static string, not an actual user ID.
   - This breaks Mux analytics segmentation by user and could leak or conflate viewer data.
   - **Fix:** Accept an optional `userId` prop and pass it through. Fall back to `'anonymous'` or an empty string if not provided. Do not fabricate user IDs.

2. **No `onError` handler on MuxPlayer**
   - If the video fails to load (network error, invalid `playbackId`, expired asset), the user sees a blank player with no feedback.
   - **Fix:** Add `onError` and `onLoadStart` callbacks to provide a fallback UI or retry mechanism. At minimum, surface a meaningful error message.

## MEDIUM Issues

3. **`style` prop creates new object every render**
   - `style={{ width: '100%', height: '100%', borderRadius: '6px' }}` is a new object reference on every render, causing unnecessary style recalculations.
   - **Fix:** Move the style object outside the component as a constant, or use a CSS class instead of inline styles for static properties. Only `borderRadius` belongs inline (to match the container's `borderRadius`).

4. **No TypeScript validation on `playbackId` format**
   - A random string like `'abc123xyz'` passes the `!playbackId` check but is not a valid Mux playback ID, resulting in a silent failure.
   - **Fix:** Add a lightweight format check (e.g., regex validation for Mux playback ID format: alphanumeric, 20-40 chars) in the guard clause, or explicitly handle the MuxPlayer `error` state.

5. **Conflicting `borderRadius` on nested element**
   - Container div has no `borderRadius` but the MuxPlayer inside has `style={{ borderRadius: '6px' }}`. This means the inner corners are rounded while the container (with `overflow: hidden`) clips them anyway — the extra style is redundant and confusing.
   - **Fix:** Remove `borderRadius` from the MuxPlayer `style` prop. The container's `overflow: hidden` handles clipping. Apply `borderRadius` only to the container div if needed.

## LOW Issues

6. **Interface name collides with `@mux/mux-player-react`'s export**
   - `interface MuxPlayerProps` shadows the imported `MuxPlayer` component name, which is confusing and could cause import aliasing issues in some setups.
   - **Fix:** Rename to `VideoPlayerProps` or `MuxPlayerComponentProps`.

7. **No `alt` or accessibility attributes on the placeholder**
   - The fallback div for empty playbackId has no `role` or `aria-label`, making it invisible to screen readers.
   - **Fix:** Add `role="status"` and `aria-label="No video available"` to the placeholder div.

8. **`aspectRatio: '16/9'` is hardcoded**
   - Not configurable. Some videos may need different aspect ratios (e.g., 4:3 for older content).
   - **Fix:** Accept an optional `aspectRatio` prop with a sensible default of `'16/9'`.

## Quality Score: 5/10

## Production Ready: NO

**Reason:** Two HIGH issues must be resolved before production. The hardcoded `viewer_user_id` is a data quality/analytics issue, and the complete lack of error handling for video load failures means users get silent blank players. The MEDIUM issues compound this by making debugging difficult (no format validation on playbackId) and creating unnecessary re-render overhead (inline style object).

**Recommendation:** Fix HIGH issues first (user ID injection and error handler), then address MEDIUM items in a follow-up iteration. LOW items are polish and can be scheduled separately.
