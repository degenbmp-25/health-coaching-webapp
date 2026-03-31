# Video Library - In-App Mux Wrapper

## Problem
Trainers need a Mux account to manage videos. Mux is developer-focused, confusing for trainers. Pain points:
- Separate Mux dashboard
- 10-asset free tier limit
- No in-app video browsing/management
- Complex for non-technical users

## Solution
Build a trainer-friendly video library UI that wraps Mux API. Trainers never touch Mux dashboard.

## Architecture

### Data Model
```prisma
model OrganizationVideo {
  id              String   @id @default(cuid())
  organizationId  String
  muxAssetId      String   // Mux asset ID
  muxPlaybackId    String   // Mux playback ID
  title           String
  thumbnailUrl    String?
  duration        Int?     // seconds
  createdAt       DateTime @default(now())
  
  organization    Organization @relation(fields: [organizationId], references: [id])
}
```

### New API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/organizations/[orgId]/videos` | GET | List org's videos |
| `/api/organizations/[orgId]/videos` | POST | Create upload URL |
| `/api/organizations/[orgId]/videos/[videoId]` | DELETE | Delete video |
| `/api/mux/webhook` | POST | Mux webhook for upload completion |

### New Pages
| Page | Purpose |
|------|---------|
| `/trainer/videos` | Video library management |
| `/trainer/videos/upload` | Upload new video |
| Modal: VideoPicker | Select video for exercise |

### Upload Flow
```
Trainer clicks "Upload Video"
→ POST /api/org/videos → returns Mux upload URL + videoId (pending)
→ Trainer uploads file directly to Mux (presigned URL)
→ Mux sends webhook to /api/mux/webhook
→ We update OrganizationVideo with muxPlaybackId
→ Video appears in library as "Ready"
```

### Video Picker (in Workout Editor)
```
Trainer clicks "Add Video" on exercise
→ Modal opens with org's video library
→ Shows video thumbnails, titles, durations
→ Trainer clicks to select
→ muxPlaybackId stored in workout_exercise.videoId (FK to OrganizationVideo)
```

## Implementation Order

### Phase 1: Core Infrastructure
1. Add OrganizationVideo model to Prisma
2. Create migration
3. Create `/api/organizations/[orgId]/videos` GET/POST routes
4. Create `/api/mux/webhook` handler
5. Basic `/trainer/videos` page listing videos

### Phase 2: Upload Flow
6. Frontend upload component with drag-drop
7. Mux upload URL generation
8. Progress indicator during upload
9. Webhook → mark video as ready

### Phase 3: Integration
10. Add "Video" button to workout exercise
11. VideoPicker modal component
12. Connect workout_exercise.videoId to OrganizationVideo
13. Update VideoPlayer to use OrganizationVideo

## Technical Notes
- Mux upload uses URL-based upload (no streaming through our server)
- Webhook must be accessible from Mux (needs HTTPS)
- Signed playback URLs still work from Mux
- Cloudinary can serve thumbnails via Mux → Cloudinary pipeline

## Non-Goals (v1)
- Video editing/trimming
- Video replacement (delete and re-upload)
- Bulk upload
- Video categories/search
