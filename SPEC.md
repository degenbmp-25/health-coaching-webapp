# Habithletics Mobile App — iOS

## Overview

Native iOS app for Habithletics gym management platform. Clients get a premium mobile experience with native features that pass Apple's App Store utility requirements.

**Why:** Current web app will be rejected by Apple as a "thin wrapper around a web view." We need a native mobile app.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Expo (React Native) |
| Language | TypeScript |
| Auth | Clerk (via @clerk/clerk-expo) |
| Backend | Existing Habithletics Prisma API |
| Database | Same PostgreSQL (Neon) |
| Push Notifications | Expo Notifications |
| Health Integration | expo-healthkit / apple-healthkit |
| Offline Storage | AsyncStorage + expo-sqlite |
| Navigation | expo-router |
| Deployment | EAS Build → TestFlight → App Store |

---

## Target Users

**Primary:** Gym clients
- View assigned workouts
- Log workout completion
- Track progress
- Receive reminders

**Secondary:** Trainers (future v2)
- View client progress
- Send messages
- Adjust programs

---

## Core Features (v1)

### 1. Authentication
- Clerk auth (same as web)
- Sign in / Sign up
- Persist session
- Role-based access (client vs trainer)

### 2. Today's Workout
- Display today's assigned workout
- Exercise list with sets/reps/weight
- Rest timer between sets
- Video demos for each exercise
- Mark exercises complete

### 3. Workout Logging
- Mark workout as complete
- Add notes to exercises
- Rate difficulty (1-5)
- Track duration
- Photo upload (form check)

### 4. Progress Dashboard
- Weekly workout completion
- Streak tracking
- Weight lifted trends (if logged)
- Visual charts

### 5. Push Notifications
- Workout reminders (configurable time)
- Program updates from trainer
- Weekly summary
- Streak at risk alerts

### 6. Offline Mode
- Download workouts for offline access
- Cache video thumbnails
- Sync when back online
- Queue completions

### 7. HealthKit Integration (v2)
- Sync completed workouts to Apple Health
- Read active calories burned
- Future: read weight from Health app

---

## App Store Requirements

### Native Utility Features
| Feature | Implementation |
|---------|----------------|
| Push Notifications | Native iOS push via Expo |
| Offline Access | Local SQLite database |
| Background Sync | expo-background-fetch |
| Apple Health | expo-healthkit |
| Camera | expo-camera for form check photos |
| Haptic Feedback | expo-haptics on interactions |

### Apple Review Checklist
- [ ] Apple Developer Account ($99/yr)
- [ ] App Icon (1024x1024 + all sizes)
- [ ] App Name: "Habithletics"
- [ ] Bundle ID: com.habithletics.app
- [ ] Screenshots (iPhone 6.5", 5.5", iPad Pro 12.9")
- [ ] Privacy Policy URL
- [ ] Support URL
- [ ] Description (localized)
- [ ] Age Rating: 4+
- [ ] Category: Health & Fitness
- [ ] TestFlight beta testing
- [ ] Privacy manifest (privacyinfo.xcprivacy)

---

## Screens

### Client Flow
```
Splash → Sign In → Home (Today's Workout)
                        ↓
                   Workout Detail
                        ↓
                   Exercise List → Complete
                        ↓
                   Progress Dashboard
                        ↓
                   Settings (notifications, profile)
```

### Screen List
1. **Splash** — App logo, loading
2. **Sign In/Up** — Clerk auth flow
3. **Home** — Today's workout card, streak, quick stats
4. **Workout Detail** — Full workout with exercises, video, timer
5. **Exercise Detail** — Single exercise view, mark complete, notes
6. **Progress** — Charts, streaks, history
7. **Settings** — Notification preferences, profile, sign out

---

## Data Flow

### Online Mode
```
Mobile App → REST API (existing Habithletics) → PostgreSQL
```

### Offline Mode
```
Mobile App → Local SQLite → Queue → Sync when online → REST API
```

### Auth Flow
```
Mobile App → Clerk → JWT Token → API calls with Authorization header
```

---

## API Integration

### Endpoints to Connect
| Endpoint | Purpose |
|----------|---------|
| GET /api/programs/client/:id | Get client's assigned program |
| GET /api/workouts/today/:clientId | Get today's workout |
| POST /api/workouts/:id/complete | Mark workout complete |
| POST /api/exercises/:id/log | Log exercise completion |
| GET /api/progress/:clientId | Get progress data |
| GET /api/clients/:id/profile | Client profile |

---

## Build & Deploy

1. **EAS Build** — Build iOS app
   ```bash
   eas build --platform ios --profile preview
   ```

2. **TestFlight** — Internal testing
   ```bash
   eas submit --platform ios --latest
   ```

3. **App Store Connect** — Submit for review

---

## Timeline Estimate

| Phase | Duration |
|-------|----------|
| Spec & Setup | 1 day |
| Auth + Basic Navigation | 2 days |
| Today's Workout + Timer | 2 days |
| Offline Mode | 2 days |
| Push Notifications | 1 day |
| Progress Dashboard | 1 day |
| HealthKit Integration | 2 days |
| App Store Submission | 1 day |
| **Total** | **~12 days** |

---

## Dependencies (Expo SDK 52)

```json
{
  "expo": "~52.0.0",
  "expo-router": "~4.0.0",
  "expo-notifications": "~0.29.0",
  "expo-sqlite": "~15.0.0",
  "expo-healthkit": "~14.0.0",
  "expo-camera": "~16.0.0",
  "expo-haptics": "~14.0.0",
  "expo-background-fetch": "~13.0.0",
  "expo-secure-store": "~14.0.0",
  "@clerk/clerk-expo": "~2.0.0",
  "@react-navigation/native": "~7.0.0",
  "react-native-screens": "~4.0.0",
  "react-native-safe-area-context": "~5.0.0"
}
```

---

## Success Criteria

1. App passes Apple review (not rejected as "web wrapper")
2. Clients can view and complete workouts offline
3. Push notifications fire correctly
4. Trainer can push program updates
5. App Store rating 4+ stars in first month

---

## Next Steps

1. ✅ Create SPEC.md (this file)
2. ⬜ Set up Expo project
3. ⬜ Integrate Clerk auth
4. ⬜ Build core screens
5. ⬜ Add offline mode
6. ⬜ Add push notifications
7. ⬜ Test on TestFlight
8. ⬜ Submit to App Store
