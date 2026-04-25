// Workout types for Habithletics Mobile

export interface Workout {
  id: string;
  name: string;
  programName: string;
  duration: number;
  exercises: Exercise[];
  completed: boolean;
  videoUrl?: string;
}

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  videoUrl?: string;
  notes?: string;
  muscleGroup: string;
  completedSets: number;
}

export interface Set {
  setNumber: number;
  reps: number;
  weight: number;
  completed: boolean;
  logId?: string;
}

export interface ExerciseLog {
  id: string;
  exerciseId: string;
  workoutId: string;
  setNumber: number;
  reps: number;
  weight: number;
  completed: boolean;
  timestamp: string;
}

export interface WorkoutCompleteRequest {
  workoutId: string;
  clientId: string;
  completedAt: string;
}

export interface ExerciseLogRequest {
  exerciseId: string;
  setNumber: number;
  reps: number;
  weight: number;
  notes?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

// Timer types
export interface TimerState {
  isRunning: boolean;
  remainingSeconds: number;
  totalSeconds: number;
}

export const TIMER_OPTIONS = [
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
  { label: '90s', value: 90 },
  { label: '2min', value: 120 },
];

// Muscle group badges
export const MUSCLE_GROUP_COLORS: Record<string, string> = {
  Chest: '#e94560',
  Back: '#4a90d9',
  Shoulders: '#9b59b6',
  Biceps: '#e67e22',
  Triceps: '#1abc9c',
  Legs: '#27ae60',
  Core: '#f39c12',
  Cardio: '#e74c3c',
  Default: '#7f8c8d',
};

export const getMuscleGroupColor = (muscleGroup: string): string => {
  return MUSCLE_GROUP_COLORS[muscleGroup] || MUSCLE_GROUP_COLORS.Default;
};
