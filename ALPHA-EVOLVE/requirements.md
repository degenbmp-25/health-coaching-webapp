# Issue #1: Trainer Tab Navigation Missing

## Problem
The trainer tab/navigation is missing or incomplete. Users cannot access trainer features properly.

## Requirements
1. **Trainer Sidebar Navigation** - Trainer section should show in dashboard sidebar with all links:
   - Programs (/trainer/programs)
   - Clients (/trainer/clients)
   - Videos (/trainer/videos)
   - Sheets (/trainer/sheets)

2. **Access Control** - Only users with trainer/coach/owner roles should see the trainer section

3. **Mobile Navigation** - Trainer links should also appear in mobile nav

4. **Persistence** - Links should persist across sessions

## Current State
- Deployed branch: fix/mux-webhook-processing
- trainerLinks in config/links.ts only has Programs and Clients
- feat/jarvis-intelligence branch has Videos but hasn't been merged/deployed

## Testing
- Verify trainer section appears in dashboard sidebar for trainer users
- Verify all trainer links (Programs, Clients, Videos, Sheets) are visible
- Verify mobile navigation shows trainer links
- Test as both trainer role and client role to verify visibility control
