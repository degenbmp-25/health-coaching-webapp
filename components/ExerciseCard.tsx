import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import type { Exercise } from '../types';
import { getMuscleGroupColor } from '../types';

interface ExerciseCardProps {
  exercise: Exercise;
  onSetComplete: (setNumber: number, completed: boolean) => void;
  onNotesChange: (notes: string) => void;
  onDifficultyRate: (rating: number) => void;
  onVideoPress?: () => void;
}

export default function ExerciseCard({
  exercise,
  onSetComplete,
  onNotesChange,
  onDifficultyRate,
  onVideoPress,
}: ExerciseCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(exercise.notes || '');
  const [difficulty, setDifficulty] = useState(0);
  const expandAnim = React.useRef(new Animated.Value(0)).current;

  const toggleExpanded = async () => {
    await Haptics.selectionAsync();
    if (!expanded) {
      Animated.timing(expandAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(expandAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
    setExpanded(!expanded);
  };

  const handleSetComplete = async (setNumber: number, completed: boolean) => {
    await Haptics.impactAsync(
      completed ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium
    );
    onSetComplete(setNumber, completed);
  };

  const handleNotesSubmit = () => {
    onNotesChange(notes);
  };

  const handleDifficultyRate = async (rating: number) => {
    await Haptics.selectionAsync();
    setDifficulty(rating);
    onDifficultyRate(rating);
  };

  const muscleColor = getMuscleGroupColor(exercise.muscleGroup);

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity onPress={toggleExpanded} activeOpacity={0.7}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.muscleBadge, { backgroundColor: muscleColor }]}>
              <Text style={styles.muscleBadgeText}>{exercise.muscleGroup}</Text>
            </View>
            <Text style={styles.exerciseName}>{exercise.name}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.setsReps}>
              {exercise.sets} × {exercise.reps} @ {exercise.weight}lbs
            </Text>
            <Text style={styles.expandIcon}>{expanded ? '▲' : '▼'}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Set Completion Row */}
      <View style={styles.setsRow}>
        {Array.from({ length: exercise.sets }, (_, i) => {
          const setNumber = i + 1;
          const isCompleted = setNumber <= exercise.completedSets;
          return (
            <TouchableOpacity
              key={setNumber}
              style={[styles.setButton, isCompleted && styles.setButtonCompleted]}
              onPress={() => handleSetComplete(setNumber, !isCompleted)}
            >
              <Text
                style={[
                  styles.setButtonText,
                  isCompleted && styles.setButtonTextCompleted,
                ]}
              >
                {isCompleted ? '✓' : setNumber}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Expandable Section */}
      {expanded && (
        <Animated.View
          style={[
            styles.expandedContent,
            {
              opacity: expandAnim,
              maxHeight: expandAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 500],
              }),
            },
          ]}
        >
          {/* Video Thumbnail */}
          {exercise.videoUrl && (
            <TouchableOpacity style={styles.videoContainer} onPress={onVideoPress}>
              <View style={styles.videoThumbnail}>
                <Text style={styles.videoPlayIcon}>▶</Text>
              </View>
              <Text style={styles.videoLabel}>Tap to watch demo</Text>
            </TouchableOpacity>
          )}

          {/* Difficulty Rating */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>How hard was this?</Text>
            <View style={styles.difficultyRow}>
              {[1, 2, 3, 4, 5].map((rating) => (
                <TouchableOpacity
                  key={rating}
                  style={styles.difficultyButton}
                  onPress={() => handleDifficultyRate(rating)}
                >
                  <Text
                    style={[
                      styles.difficultyText,
                      rating <= difficulty && styles.difficultyTextActive,
                    ]}
                  >
                    {rating <= difficulty ? '●' : '○'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Notes</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              onBlur={handleNotesSubmit}
              placeholder="Add notes about form, weight adjustments..."
              placeholderTextColor="#7f8c8d"
              multiline
              numberOfLines={3}
            />
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  muscleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 10,
  },
  muscleBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  setsReps: {
    fontSize: 14,
    color: '#7f8c8d',
    marginRight: 10,
  },
  expandIcon: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  setsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  setButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0f3460',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#0f3460',
  },
  setButtonCompleted: {
    backgroundColor: '#4a90d9',
    borderColor: '#4a90d9',
  },
  setButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7f8c8d',
  },
  setButtonTextCompleted: {
    color: '#fff',
  },
  expandedContent: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#0f3460',
    paddingTop: 16,
    overflow: 'hidden',
  },
  videoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  videoThumbnail: {
    width: '100%',
    height: 120,
    backgroundColor: '#0f3460',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  videoPlayIcon: {
    fontSize: 40,
    color: '#4a90d9',
  },
  videoLabel: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
    fontWeight: '600',
  },
  difficultyRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  difficultyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  difficultyText: {
    fontSize: 28,
    color: '#0f3460',
  },
  difficultyTextActive: {
    color: '#e94560',
  },
  notesInput: {
    backgroundColor: '#0f3460',
    borderRadius: 12,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
