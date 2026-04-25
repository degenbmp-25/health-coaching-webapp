import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

interface WeekData {
  day: string;
  workouts: number;
  completed: boolean;
}

const weeklyData: WeekData[] = [
  { day: 'Mon', workouts: 1, completed: true },
  { day: 'Tue', workouts: 1, completed: true },
  { day: 'Wed', workouts: 0, completed: false },
  { day: 'Thu', workouts: 1, completed: true },
  { day: 'Fri', workouts: 1, completed: true },
  { day: 'Sat', workouts: 1, completed: true },
  { day: 'Sun', workouts: 0, completed: false },
];

interface MonthlyData {
  week: string;
  volume: number;
}

const monthlyData: MonthlyData[] = [
  { week: 'W1', volume: 85 },
  { week: 'W2', volume: 92 },
  { week: 'W3', volume: 78 },
  { week: 'W4', volume: 95 },
];

interface ExerciseProgress {
  name: string;
  current: number;
  previous: number;
  unit: string;
}

const exerciseProgress: ExerciseProgress[] = [
  { name: 'Bench Press', current: 155, previous: 145, unit: 'lbs' },
  { name: 'Squat', current: 205, previous: 195, unit: 'lbs' },
  { name: 'Deadlift', current: 225, previous: 215, unit: 'lbs' },
  { name: 'Overhead Press', current: 75, previous: 70, unit: 'lbs' },
];

export default function ProgressScreen() {
  const totalWorkouts = weeklyData.filter(d => d.completed).length;
  const maxVolume = Math.max(...monthlyData.map(d => d.volume));
  const totalVolume = exerciseProgress.reduce((sum, e) => sum + e.current, 0);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Your Progress</Text>
          <Text style={styles.subtitle}>Track your gains</Text>
        </View>

        {/* Weekly Activity */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>This Week</Text>
          <View style={styles.weekRow}>
            {weeklyData.map((day, index) => (
              <View key={index} style={styles.dayContainer}>
                <View 
                  style={[
                    styles.dayDot,
                    day.completed ? styles.dayCompleted : styles.dayMissed
                  ]}
                />
                <Text style={styles.dayLabel}>{day.day}</Text>
              </View>
            ))}
          </View>
          <View style={styles.weeklyStats}>
            <View style={styles.weeklyStat}>
              <Text style={styles.weeklyStatNumber}>{totalWorkouts}</Text>
              <Text style={styles.weeklyStatLabel}>Workouts</Text>
            </View>
            <View style={styles.weeklyStat}>
              <Text style={styles.weeklyStatNumber}>5</Text>
              <Text style={styles.weeklyStatLabel}>Day Streak</Text>
            </View>
            <View style={styles.weeklyStat}>
              <Text style={styles.weeklyStatNumber}>2</Text>
              <Text style={styles.weeklyStatLabel}>Rest Days</Text>
            </View>
          </View>
        </View>

        {/* Monthly Volume Chart */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Monthly Volume</Text>
          <View style={styles.chartContainer}>
            {monthlyData.map((week, index) => (
              <View key={index} style={styles.chartBar}>
                <View 
                  style={[
                    styles.chartFill,
                    { height: `${(week.volume / maxVolume) * 100}%` }
                  ]} 
                />
                <Text style={styles.chartLabel}>{week.week}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Strength Progress */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Strength PRs</Text>
          {exerciseProgress.map((exercise, index) => (
            <View key={index} style={styles.prItem}>
              <View style={styles.prInfo}>
                <Text style={styles.prName}>{exercise.name}</Text>
                <Text style={styles.prChange}>
                  +{exercise.current - exercise.previous} from last month
                </Text>
              </View>
              <View style={styles.prValue}>
                <Text style={styles.prCurrent}>{exercise.current}</Text>
                <Text style={styles.prUnit}>{exercise.unit}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Summary Stats */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>47</Text>
            <Text style={styles.summaryLabel}>Total Workouts</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>28.5h</Text>
            <Text style={styles.summaryLabel}>Total Time</Text>
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
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 5,
  },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dayContainer: {
    alignItems: 'center',
  },
  dayDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginBottom: 8,
  },
  dayCompleted: {
    backgroundColor: '#4a90d9',
  },
  dayMissed: {
    backgroundColor: '#0f3460',
    borderWidth: 2,
    borderColor: '#e94560',
  },
  dayLabel: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  weeklyStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#0f3460',
    paddingTop: 20,
  },
  weeklyStat: {
    alignItems: 'center',
  },
  weeklyStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4a90d9',
  },
  weeklyStatLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
  },
  chartBar: {
    alignItems: 'center',
    width: 50,
  },
  chartFill: {
    width: 30,
    backgroundColor: '#4a90d9',
    borderRadius: 4,
    minHeight: 20,
  },
  chartLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 8,
  },
  prItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },
  prInfo: {
    flex: 1,
  },
  prName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  prChange: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 4,
  },
  prValue: {
    alignItems: 'flex-end',
  },
  prCurrent: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  prUnit: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#e94560',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 5,
  },
});