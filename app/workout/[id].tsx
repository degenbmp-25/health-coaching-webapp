import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import * as Haptics from 'expo-haptics';
import { getWorkout, completeWorkout, logExercise, updateExerciseNotes, rateWorkoutDifficulty } from '../../lib/api';
import type { Workout, Exercise } from '../../types';
import ExerciseCard from '../../components/ExerciseCard';
import RestTimer from '../../components/RestTimer';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuth();
  const router = useRouter();

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTimer, setShowTimer] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [difficultyRatings, setDifficultyRatings] = useState<Record<string, number>>({});

  useEffect(() => {
    if (id) {
      fetchWorkout(id);
    }
  }, [id]);

  const fetchWorkout = async (workoutId: string) => {
    setLoading(true);
    setError(null);

    const response = await getWorkout(workoutId);

    if (response.success && response.data) {
      setWorkout(response.data);
    } else {
      setError(response.error || 'Failed to load workout');
    }

    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (id) {
      await fetchWorkout(id);
    }
    setRefreshing(false);
  };

  const handleSetComplete = async (exerciseId: string, setNumber: number, completed: boolean) => {
    if (!userId || !workout) return;

    const exercise = workout.exercises.find((e) => e.id === exerciseId);
    if (!exercise) return;

    // Update local state optimistically
    setWorkout((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((ex) => {
          if (ex.id === exerciseId) {
            const newCompletedSets = completed
              ? Math.max(ex.completedSets, setNumber)
              : Math.max(0, setNumber - 1);
            return { ...ex, completedSets: newCompletedSets };
          }
          return ex;
        }),
      };
    });

    // If completing a set, offer rest timer
    if (completed && setNumber < exercise.sets) {
      setCurrentExerciseIndex(workout.exercises.findIndex((e) => e.id === exerciseId));
      setShowTimer(true);
    }

    // Sync to backend with error handling
    try {
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
            exercises: prev.exercises.map((ex) => {
              const original = previousState.find((p) => p.id === ex.id);
              return original || ex;
            }),
          };
        });
        Alert.alert('Error', 'Failed to log set. Please try again.');
      }
    } catch (error) {
      // Rollback on error
      setWorkout((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          exercises: prev.exercises.map((ex) => {
            const original = previousState.find((p) => p.id === ex.id);
            return original || ex;
          }),
        };
      });
      Alert.alert('Error', 'Failed to log set. Please try again.');
    }
  };

  const handleNotesChange = async (exerciseId: string, notes: string) => {
    try {
      await updateExerciseNotes(exerciseId, notes);
    } catch (error) {
      Alert.alert('Error', 'Failed to save notes. Please try again.');
    }
  };

  const handleDifficultyRate = async (exerciseId: string, rating: number) => {
    setDifficultyRatings((prev) => ({ ...prev, [exerciseId]: rating }));
    try {
      await rateWorkoutDifficulty(exerciseId, rating);
    } catch (error) {
      setDifficultyRatings((prev) => {
        const updated = { ...prev };
        delete updated[exerciseId];
        return updated;
      });
      Alert.alert('Error', 'Failed to save rating. Please try again.');
    }
  };

  const handleFinishWorkout = async () => {
    if (!userId || !workout) return;

    Alert.alert(
      'Finish Workout',
      'Are you sure you want to mark this workout as complete?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            const response = await completeWorkout(workout.id, userId);
            if (response.success) {
              router.back();
            } else {
              Alert.alert('Error', response.error || 'Failed to complete workout');
            }
          },
        },
      ]
    );
  };

  const handleTimerComplete = () => {
    setShowTimer(false);
  };

  const handleTimerSkip = () => {
    setShowTimer(false);
    // Advance to next exercise
    if (currentExerciseIndex < (workout?.exercises.length || 0) - 1) {
      setCurrentExerciseIndex((prev) => prev + 1);
    }
  };

  const totalExercises = workout?.exercises.length || 0;
  const completedExercises = workout?.exercises.filter(
    (e) => e.completedSets >= e.sets
  ).length || 0;
  const progress = totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a90d9" />
        <Text style={styles.loadingText}>Loading workout...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => id && fetchWorkout(id)}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!workout) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Workout not found</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
        {/* Workout Header */}
        <View style={styles.workoutHeader}>
          <Text style={styles.programName}>{workout.programName}</Text>
          <Text style={styles.workoutName}>{workout.name}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.duration}>{workout.duration} min</Text>
            <Text style={styles.separator}>•</Text>
            <Text style={styles.exerciseCount}>{totalExercises} exercises</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {completedExercises}/{totalExercises} exercises completed
          </Text>
        </View>

        {/* Rest Timer Button */}
        <TouchableOpacity
          style={styles.restTimerButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowTimer(true);
          }}
        >
          <Text style={styles.restTimerIcon}>⏱️</Text>
          <Text style={styles.restTimerText}>Start Rest Timer</Text>
        </TouchableOpacity>

        {/* Exercise List */}
        <View style={styles.exerciseList}>
          {workout.exercises.map((exercise, index) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onSetComplete={(setNumber, completed) =>
                handleSetComplete(exercise.id, setNumber, completed)
              }
              onNotesChange={(notes) => handleNotesChange(exercise.id, notes)}
              onDifficultyRate={(rating) =>
                handleDifficultyRate(exercise.id, rating)
              }
              onVideoPress={() => {
                if (exercise.videoUrl) {
                  // TODO: Open video player modal
                  Alert.alert('Video', 'Video player coming soon');
                }
              }}
            />
          ))}
        </View>

        {/* Finish Workout Button */}
        <TouchableOpacity
          style={[
            styles.finishButton,
            completedExercises === 0 && styles.finishButtonDisabled,
          ]}
          onPress={handleFinishWorkout}
          disabled={completedExercises === 0}
        >
          <Text style={styles.finishButtonText}>Finish Workout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Rest Timer Modal */}
      <RestTimer
        visible={showTimer}
        onClose={() => setShowTimer(false)}
        onComplete={handleTimerComplete}
        onSkip={handleTimerSkip}
      />
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
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#7f8c8d',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    color: '#e94560',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#16213e',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#4a90d9',
    fontSize: 16,
    fontWeight: '600',
  },
  workoutHeader: {
    marginBottom: 20,
  },
  programName: {
    fontSize: 14,
    color: '#4a90d9',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  workoutName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  duration: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  separator: {
    fontSize: 14,
    color: '#7f8c8d',
    marginHorizontal: 8,
  },
  exerciseCount: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  progressSection: {
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#0f3460',
    borderRadius: 4,
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4a90d9',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  restTimerButton: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1abc9c',
  },
  restTimerIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  restTimerText: {
    color: '#1abc9c',
    fontSize: 16,
    fontWeight: '600',
  },
  exerciseList: {
    marginBottom: 30,
  },
  finishButton: {
    backgroundColor: '#4a90d9',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 40,
  },
  finishButtonDisabled: {
    backgroundColor: '#0f3460',
  },
  finishButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
