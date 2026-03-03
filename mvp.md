# Workout App - MVP Structure

## Files

```
workout-app/
├── app/
│   ├── page.tsx          # Today's workout
│   ├── layout.tsx         # Mobile wrapper
│   ├── globals.css        # Tailwind
│   └── api/
│       └── workout/route.ts  # Sheets API
├── lib/
│   └── google-sheets.ts   # Read from Sheets
├── package.json
└── .env.local           # Sheet ID + credentials
```

## Core Code

### lib/google-sheets.ts
```typescript
import { google } from 'googleapis';

export async function getWorkout(client: string, day: string) {
  const sheets = google.sheets({ version: 'v4' });
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range: 'Workouts!A:F',
  });
  
  return response.data.values;
}
```

### app/page.tsx
```tsx
export default function TodayWorkout() {
  const workout = await getWorkout('john', 'Monday');
  
  return (
    <div className="mobile-card">
      <h1>Today's Workout</h1>
      {workout.map(exercise => (
        <ExerciseCard 
          key={exercise.name}
          exercise={exercise}
        />
      ))}
    </div>
  );
}
```

### ExerciseCard Component
```tsx
function ExerciseCard({ exercise }) {
  return (
    <div className="exercise">
      <video src={exercise.video} />
      <h3>{exercise.name}</h3>
      <p>{exercise.sets} x {exercise.reps}</p>
      <button>Done ✓</button>
    </div>
  );
}
```

## Quick Deploy

Vercel → GitHub → auto-deploy on push

## Sheet → Web flow

1. You edit Sheet
2. Client opens web app
3. Sees today's workout
4. Checks off exercises
5. Progress syncs to Sheet

## Cost

- Hosting: Free (Vercel)
- Sheet: Free
- Domain: $12/year

## Next: Auth

Clerk or NextAuth for client login
