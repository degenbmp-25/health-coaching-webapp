// API client for Habithletics backend
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import type {
  Workout,
  Exercise,
  WorkoutCompleteRequest,
  ExerciseLogRequest,
  ApiResponse,
} from '../types';

// API base URL - should be set via EXPO_PUBLIC_APP_URL env var
const APP_URL = Constants.expoConfig?.extra?.appUrl || 'http://localhost:3000';

// Clerk token storage key
const CLERK_TOKEN_KEY = 'clerk_session_token';

/**
 * Get the Clerk auth token for API requests
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const token = await SecureStore.getItemAsync(CLERK_TOKEN_KEY);
    return token;
  } catch {
    return null;
  }
}

/**
 * Make an authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = await getAuthToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${APP_URL}${endpoint}`, {
      ...options,
      headers,
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        error: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        success: false,
      };
    }

    const data = await response.json();
    return { data, success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Network request failed',
      success: false,
    };
  }
}

/**
 * Fetch today's workout for a client
 * GET /api/workouts/today/:clientId
 */
export async function getTodaysWorkout(clientId: string): Promise<ApiResponse<Workout>> {
  return apiRequest<Workout>(`/api/workouts/today/${clientId}`, {
    method: 'GET',
  });
}

/**
 * Mark a workout as complete
 * POST /api/workouts/:id/complete
 */
export async function completeWorkout(
  workoutId: string,
  clientId: string
): Promise<ApiResponse<{ success: boolean }>> {
  return apiRequest<{ success: boolean }>(`/api/workouts/${workoutId}/complete`, {
    method: 'POST',
    body: JSON.stringify({
      clientId,
      completedAt: new Date().toISOString(),
    }),
  });
}

/**
 * Log exercise completion
 * POST /api/exercises/:id/log
 */
export async function logExercise(
  exerciseId: string,
  data: ExerciseLogRequest
): Promise<ApiResponse<{ logId: string; success: boolean }>> {
  return apiRequest<{ logId: string; success: boolean }>(
    `/api/exercises/${exerciseId}/log`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );
}

/**
 * Fetch a single workout by ID
 * GET /api/workouts/:id
 */
export async function getWorkout(workoutId: string): Promise<ApiResponse<Workout>> {
  return apiRequest<Workout>(`/api/workouts/${workoutId}`, {
    method: 'GET',
  });
}

/**
 * Update exercise notes
 * PATCH /api/exercises/:id/notes
 */
export async function updateExerciseNotes(
  exerciseId: string,
  notes: string
): Promise<ApiResponse<{ success: boolean }>> {
  return apiRequest<{ success: boolean }>(`/api/exercises/${exerciseId}/notes`, {
    method: 'PATCH',
    body: JSON.stringify({ notes }),
  });
}

/**
 * Rate workout difficulty
 * POST /api/workouts/:id/rate
 */
export async function rateWorkoutDifficulty(
  workoutId: string,
  rating: number
): Promise<ApiResponse<{ success: boolean }>> {
  return apiRequest<{ success: boolean }>(`/api/workouts/${workoutId}/rate`, {
    method: 'POST',
    body: JSON.stringify({ rating }),
  });
}
