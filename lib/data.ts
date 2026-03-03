// Mock workout data - in production this would come from Google Sheets
export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  rest: number;
  videoUrl?: string;
  notes?: string;
}

export interface Workout {
  id: string;
  day: string;
  date: string;
  focus: string;
  exercises: (Exercise | { type: 'rest'; duration: number })[];
}

const today = new Date();
const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
const formattedDate = today.toLocaleDateString('en-US', { 
  month: 'long', 
  day: 'numeric',
  year: 'numeric'
});

export const mockWorkout: Workout = {
  id: 'w1',
  day: dayName,
  date: formattedDate,
  focus: 'Upper Body Strength',
  exercises: [
    {
      id: 'e1',
      name: 'Push-ups',
      sets: 4,
      reps: '12-15',
      rest: 60,
      notes: 'Keep core tight, full range of motion'
    },
    {
      id: 'e2',
      name: 'Dumbbell Rows',
      sets: 3,
      reps: '12 each arm',
      rest: 60,
      notes: 'Pull to hip, squeeze at top'
    },
    {
      type: 'rest',
      duration: 90
    },
    {
      id: 'e3',
      name: 'Shoulder Press',
      sets: 3,
      reps: '10-12',
      rest: 60,
      notes: 'Overhead, lock out at top'
    },
    {
      id: 'e4',
      name: 'Tricep Dips',
      sets: 3,
      reps: '12-15',
      rest: 60,
      notes: 'Bench or chair, control the descent'
    },
    {
      id: 'e5',
      name: 'Plank Hold',
      sets: 3,
      reps: '45 sec',
      rest: 45,
      notes: 'Keep hips level, breathe steadily'
    }
  ]
};
