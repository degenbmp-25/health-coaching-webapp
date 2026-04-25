import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getTodaysWorkout } from '../lib/api';
import type { Workout, Exercise } from '../types';

export default function HomeScreen() {
  const { isSignedIn, userId } = useAuth();
  const router = useRouter();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streak, setStreak] = useState(7);

  useEffect(() => {
    if (userId) {
      fetchTodaysWorkout();
    }
  }, [userId]);

  const fetchTodaysWorkout = async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    const response = await getTodaysWorkout(userId);

    if (response.success && response.data) {
      setWorkout(response.data);
    } else if (response.error) {
      // If API fails, we'll show no workout - don't use mock data
      setError(response.error);
      setWorkout(null);
    }

    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTodaysWorkout();
    setRefreshing(false);
  };

  const startWorkout = () => {
    if (workout) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push(`/workout/${workout.id}`);
    }
  };

  const toggleExerciseComplete = async (exerciseId: string) => {
    if (!userId || !workout) return;

    const exercise = workout.exercises.find((ex) => ex.id === exerciseId);
    if (!exercise) return;


    const newCompletedSets = exercise.completedSets >= exercise.sets ? 0 : exercise.completedSets + 1;
    const wasCompleted = exercise.completedSets >= exercise.sets;
    const setNumber = wasCompleted ? 0 : exercise.completedSets + 1;


    Haptics.selectionAsync();

    // Optimistic update
    setWorkout((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((ex) =>
          ex.id === exerciseId
            ? { ...ex, completedSets: newCompletedSets }
            : ex
        ),
      };
    });

    // Persist to backend
    const response = await logExercise(exerciseId, {
      exerciseId,
      setNumber,
      reps: exercise.reps,
      weight: exercise.weight,
    });

    if (!response.success) {
      // Rollback on failure
      setWorkout((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          exercises: prev.exercises.map((ex) =>
            ex.id === exerciseId
              ? { ...ex, completedSets: exercise.completedSets }
              : ex
          ),
        };
      });
    }
  };

  const completedCount = workout?.exercises.filter(
    (e) => e.completedSets >= e.sets
  ).length || 0;
  const totalExercises = workout?.exercises.length || 0;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4a90d9"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome back!</Text>
          <Text style={styles.subtitle}>Ready to crush it today?</Text>
        </View>

        {/* Streak Card */}
        <View style={styles.streakCard}>
          <View style={styles.streakContent}>
            <Text style={styles.streakNumber}>{streak}</Text>
            <Text style={styles.streakLabel}>Day Streak 🔥</Text>
          </View>
          <TouchableOpacity style={styles.streakButton}>
            <Text style={styles.streakButtonText}>View Badges</Text>
          </TouchableOpacity>
        </View>

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#4a90d9" />
            <Text style={styles.loadingText}>Loading today's workout...</Text>
          </View>
        )}

        {/* Error State */}
        {error && !loading && (
          <View style={styles.errorCard}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>No Workout Available</Text>
            <Text style={styles.errorText}>
              {error}. Check back later or contact your trainer.
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
              <Text style={styles.retryButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Today's Workout Card */}
        {!loading && !error && workout && (
          <View style={styles.workoutCard}>
            <View style={styles.workoutHeader}>
              <Text style={styles.workoutTitle}>Today's Workout</Text>
              <Text style={styles.workoutDuration}>{workout.duration} min</Text>
            </View>

            <Text style={styles.workoutName}>{workout.name}</Text>

            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${totalExercises > 0 ? (completedCount / totalExercises) * 100 : 0}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {completedCount}/{totalExercises} exercises completed
            </Text>

            {/* Exercise Preview */}
            <View style={styles.exerciseList}>
              {workout.exercises.slice(0, 3).map((exercise) => {
                const isCompleted = exercise.completedSets >= exercise.sets;
                return (
                  <TouchableOpacity
                    key={exercise.id}
                    style={styles.exerciseItem}
                    onPress={() => toggleExerciseComplete(exercise.id)}
                  >
                    <View style={styles.exerciseCheck}>
                      <Text style={isCompleted ? styles.checkCompleted : styles.checkEmpty}>
                        {isCompleted ? '✓' : '○'}
                      </Text>
                    </View>
                    <View style={styles.exerciseInfo}>
                      <Text
                        style={[
                          styles.exerciseName,
                          isCompleted && styles.exerciseCompleted,
                        ]}
                      >
                        {exercise.name}
                      </Text>
                      <Text style={styles.exerciseSets}>
                        {exercise.sets} sets × {exercise.reps} reps @ {exercise.weight}lbs
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
              {totalExercises > 3 && (
                <Text style={styles.moreExercises}>+{totalExercises - 3} more exercises</Text>
              )}
            </View>

            <TouchableOpacity style={styles.startButton} onPress={startWorkout}>
              <Text style={styles.startButtonText}>Start Workout</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* No Workout State */}
        {!loading && !error && !workout && (
          <View style={styles.noWorkoutCard}>
            <Text style={styles.noWorkoutIcon}>🏋️</Text>
            <Text style={styles.noWorkoutTitle}>No Workout Scheduled</Text>
            <Text style={styles.noWorkoutText}>
              You don't have a workout for today. Great rest day or check with your trainer!
            </Text>
          </View>
        )}

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>Workouts This Month</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>4.5h</Text>
            <Text style={styles.statLabel}>Total Time</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 25,
  },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 5,
  },
  streakCard: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e94560',
  },
  streakContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#e94560',
    marginRight: 15,
  },
  streakLabel: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  streakButton: {
    backgroundColor: '#e94560',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  streakButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  loadingCard: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 40,
    marginBottom: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#7f8c8d',
    fontSize: 16,
    marginTop: 16,
  },
  errorCard: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 30,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e94560',
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#e94560',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  workoutCard: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  workoutTitle: {
    fontSize: 14,
    color: '#4a90d9',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  workoutDuration: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  workoutName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#0f3460',
    borderRadius: 3,
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4a90d9',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 20,
  },
  exerciseList: {
    marginBottom: 20,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },
  exerciseCheck: {
    marginRight: 15,
  },
  checkCompleted: {
    fontSize: 20,
    color: '#4a90d9',
  },
  checkEmpty: {
    fontSize: 20,
    color: '#7f8c8d',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  exerciseCompleted: {
    textDecorationLine: 'line-through',
    color: '#7f8c8d',
  },
  exerciseSets: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  moreExercises: {
    color: '#4a90d9',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: '#4a90d9',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  noWorkoutCard: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 40,
    marginBottom: 20,
    alignItems: 'center',
  },
  noWorkoutIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  noWorkoutTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  noWorkoutText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 5,
    textAlign: 'center',
  },
});
