import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

interface Workout {
  id: string;
  name: string;
  duration: number;
  exercises: Exercise[];
  completed: boolean;
}

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  completed: boolean;
}

// Mock data for demonstration
const mockWorkout: Workout = {
  id: '1',
  name: 'Upper Body Strength',
  duration: 45,
  exercises: [
    { id: 'e1', name: 'Bench Press', sets: 4, reps: 8, weight: 135, completed: false },
    { id: 'e2', name: 'Bent Over Row', sets: 4, reps: 10, weight: 95, completed: false },
    { id: 'e3', name: 'Shoulder Press', sets: 3, reps: 10, weight: 65, completed: false },
    { id: 'e4', name: 'Bicep Curls', sets: 3, reps: 12, weight: 25, completed: false },
  ],
  completed: false,
};

export default function HomeScreen() {
  const { isSignedIn, userId } = useAuth();
  const router = useRouter();
  const [workout, setWorkout] = useState<Workout | null>(mockWorkout);
  const [refreshing, setRefreshing] = useState(false);
  const [streak, setStreak] = useState(7);

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const startWorkout = () => {
    if (workout) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push(`/workout/${workout.id}`);
    }
  };

  const toggleExerciseComplete = (exerciseId: string) => {
    Haptics.selectionAsync();
    if (workout) {
      setWorkout({
        ...workout,
        exercises: workout.exercises.map(ex =>
          ex.id === exerciseId ? { ...ex, completed: !ex.completed } : ex
        ),
      });
    }
  };

  const completedCount = workout?.exercises.filter(e => e.completed).length || 0;
  const totalExercises = workout?.exercises.length || 0;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4a90d9" />
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

        {/* Today's Workout Card */}
        <View style={styles.workoutCard}>
          <View style={styles.workoutHeader}>
            <Text style={styles.workoutTitle}>Today's Workout</Text>
            <Text style={styles.workoutDuration}>{workout?.duration} min</Text>
          </View>
          
          <Text style={styles.workoutName}>{workout?.name}</Text>
          
          <View style={styles.progressBar}>
            <View 
              style={[styles.progressFill, { width: `${(completedCount / totalExercises) * 100}%` }]} 
            />
          </View>
          <Text style={styles.progressText}>
            {completedCount}/{totalExercises} exercises completed
          </Text>

          {/* Exercise Preview */}
          <View style={styles.exerciseList}>
            {workout?.exercises.slice(0, 3).map((exercise) => (
              <TouchableOpacity
                key={exercise.id}
                style={styles.exerciseItem}
                onPress={() => toggleExerciseComplete(exercise.id)}
              >
                <View style={styles.exerciseCheck}>
                  <Text style={exercise.completed ? styles.checkCompleted : styles.checkEmpty}>
                    {exercise.completed ? '✓' : '○'}
                  </Text>
                </View>
                <View style={styles.exerciseInfo}>
                  <Text style={[styles.exerciseName, exercise.completed && styles.exerciseCompleted]}>
                    {exercise.name}
                  </Text>
                  <Text style={styles.exerciseSets}>
                    {exercise.sets} sets × {exercise.reps} reps @ {exercise.weight}lbs
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            {totalExercises > 3 && (
              <Text style={styles.moreExercises}>+{totalExercises - 3} more exercises</Text>
            )}
          </View>

          <TouchableOpacity style={styles.startButton} onPress={startWorkout}>
            <Text style={styles.startButtonText}>Start Workout</Text>
          </TouchableOpacity>
        </View>

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