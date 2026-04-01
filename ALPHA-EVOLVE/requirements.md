# Alpha-Evolve Requirements: Coach Add Client Fix

**Codebase:** habithletics-redesign-evolve
**Date:** 2026-04-01
**Priority:** CRITICAL - blocker for going live
**Deployment URL:** https://habithletics-redesign-evolve-coral.vercel.app

## Issues to Fix

### Issue 1: "Add as Client" Returns 403 Forbidden (CRITICAL)
**Current behavior:** Coach clicks "Add as Client" button, gets "Forbidden" error
**Root cause:** The ClientSelector component calls `/api/users/${userId}/coach` PATCH, but that endpoint only allows users to set their OWN coach, not for coaches to set clients.

**Expected behavior:** Coach should be able to search for users and add them as clients.

### Issue 2: Client Search Only Works by Email (HIGH)
**Current behavior:** ClientSelector only searches users by email address
**Expected behavior:** Client search should find users by:
- Email address (exact or partial match)
- Name (exact or partial match)

## Technical Context

### Current Code Structure
- `components/coach/ClientSelector.tsx` - Component for coaches to search/add clients
- `app/api/users/[userId]/students/route.ts` - GET returns coach's students, POST was just created to add students
- `app/api/users/search/route.ts` - Search endpoint (needs to be enhanced)

### Search API Location
The search currently uses `/api/users/search?q=` which searches by email. Need to enhance to also search by name.

## Success Criteria
1. Coach can search for users by email OR name
2. Coach can add a user as client without getting 403 Forbidden
3. Added client appears in coach's student dashboard
4. Works on both desktop and mobile viewports

## Files Likely to Change
- `components/coach/ClientSelector.tsx` - Fix API call, add name search
- `app/api/users/search/route.ts` - Enhance to search by name in addition to email
- `app/api/users/[userId]/students/route.ts` - Verify POST works correctly

## Test Account
- Email: thehivemindintelligence@gmail.com
- Password: clawdaunt
- Role: client in Habithletics Gym

## Notes
- The coach account is bmp19076@gmail.com (needs to sign in first)
- The test client to add is kvnmiller11@gmail.com or thehivemindintelligence@gmail.com
