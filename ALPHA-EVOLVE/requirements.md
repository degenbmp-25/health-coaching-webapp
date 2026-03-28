# Alpha-Evolve: Habithletics Webapp

## Target
`/home/magic_000/BeastmodeVault/vault/projects/habithletics-evolve`

## Goal
Improve the Habithletics health coaching webapp. The app currently works but has several issues that need addressing.

## Current State
- Next.js 14 workout app
- Reads workouts from Google Sheets via CSV URL
- Client-side logging to localStorage
- No authentication
- Basic error handling

## Known Issues
1. **App didn't load** - user reported app failing to load in production
2. **No auth** - anyone can see workout data
3. **localStorage only** - workout logs don't sync back to Google Sheets
4. **Poor error handling** - just `console.error`, no user feedback
5. **No loading skeleton** - just text "Loading workouts..."
6. **Duplicate code** - sheets.ts has conflicting mock exports at bottom

## Requirements
1. Fix the app loading issue (production deployment failed)
2. Add proper error handling with user-friendly messages
3. Add loading skeleton/suspense states
4. Clean up duplicate code (mock data conflict)
5. Add basic authentication (per-client access)

## Success Criteria
- App loads in < 3 seconds
- User sees meaningful error messages if something fails
- Clean code with no duplicate/conflicting exports
- Basic auth so each client sees only their data

## Max Loops
5

## Started
2026-03-28T13:53:00Z

