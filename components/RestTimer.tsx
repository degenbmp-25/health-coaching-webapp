import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  AppState,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { TIMER_OPTIONS } from '../types';

interface RestTimerProps {
  visible: boolean;
  onClose: () => void;
  onComplete?: () => void;
  onSkip?: () => void;
  initialDuration?: number;
  autoAdvance?: boolean;
}

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.6;
const STROKE_WIDTH = 12;

export default function RestTimer({
  visible,
  onClose,
  onComplete,
  onSkip,
  initialDuration = 60,
  autoAdvance = false,
}: RestTimerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(initialDuration);
  const [remainingSeconds, setRemainingSeconds] = useState(initialDuration);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const appStateRef = useRef(AppState.currentState);

  const totalSeconds = selectedDuration;
  const progress = (totalSeconds - remainingSeconds) / totalSeconds;

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/active/) &&
        nextAppState.match(/inactive|background/)
      ) {
        // App is going to background - pause the timer
        if (isRunning) {
          setIsRunning(false);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
        }
      }
      appStateRef.current = nextAppState;
    });


    return () => {
      subscription.remove();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const triggerCompletion = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (autoAdvance && onSkip) {
      onSkip();
    }
    if (onComplete) {
      onComplete();
    }
  };

  const startTimer = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRunning(true);
  };

  const pauseTimer = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const resetTimer = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRunning(false);
    setRemainingSeconds(selectedDuration);
    progressAnim.setValue(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const selectDuration = async (seconds: number) => {
    await Haptics.selectionAsync();
    setSelectedDuration(seconds);
    setRemainingSeconds(seconds);
    setIsRunning(false);
    progressAnim.setValue(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const skipTimer = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsRunning(false);
    setRemainingSeconds(selectedDuration);
    progressAnim.setValue(0);
    if (onSkip) {
      onSkip();
    }
    onClose();
  };

  const strokeDashoffset = CIRCLE_SIZE * Math.PI * (1 - progress * 0.8);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <Text style={styles.title}>Rest Timer</Text>

          {/* Timer Circle */}
          <View style={styles.timerCircleContainer}>
            <View style={styles.timerCircleBackground}>
              <Animated.View
                style={[
                  styles.timerCircleProgress,
                  {
                    transform: [
                      {
                        rotate: progressAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      },
                    ],
                  },
                ]}
              />
            </View>
            <View style={styles.timerCircleInner}>
              <Text style={styles.timerText}>{formatTime(remainingSeconds)}</Text>
              <Text style={styles.timerLabel}>
                {isRunning ? 'Resting...' : 'Ready'}
              </Text>
            </View>
          </View>

          {/* Duration Selector */}
          <View style={styles.durationSelector}>
            {TIMER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.durationButton,
                  selectedDuration === option.value && styles.durationButtonActive,
                ]}
                onPress={() => selectDuration(option.value)}
                disabled={isRunning}
              >
                <Text
                  style={[
                    styles.durationButtonText,
                    selectedDuration === option.value && styles.durationButtonTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            {!isRunning ? (
              <TouchableOpacity style={styles.startButton} onPress={startTimer}>
                <Text style={styles.startButtonText}>Start</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.pauseButton} onPress={pauseTimer}>
                <Text style={styles.pauseButtonText}>Pause</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.resetButton} onPress={resetTimer}>
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipButton} onPress={skipTimer}>
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
          </View>

          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#16213e',
    borderRadius: 24,
    padding: 30,
    width: width * 0.85,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 30,
  },
  timerCircleContainer: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  timerCircleBackground: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: STROKE_WIDTH,
    borderColor: '#0f3460',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerCircleProgress: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: STROKE_WIDTH,
    borderColor: '#4a90d9',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  },
  timerCircleInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  timerLabel: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 5,
  },
  durationSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  durationButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#0f3460',
    marginHorizontal: 6,
  },
  durationButtonActive: {
    backgroundColor: '#4a90d9',
  },
  durationButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  durationButtonTextActive: {
    color: '#fff',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  startButton: {
    backgroundColor: '#4a90d9',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
    marginHorizontal: 6,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  pauseButton: {
    backgroundColor: '#e67e22',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
    marginHorizontal: 6,
  },
  pauseButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: '#0f3460',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 12,
    marginHorizontal: 6,
  },
  resetButtonText: {
    color: '#7f8c8d',
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    backgroundColor: '#1abc9c',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 12,
    marginHorizontal: 6,
  },
  skipButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    marginTop: 10,
    paddingVertical: 12,
  },
  closeButtonText: {
    color: '#7f8c8d',
    fontSize: 16,
  },
});
