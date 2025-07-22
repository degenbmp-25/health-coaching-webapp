import { getUserActivities } from "@/lib/api/activities"
import {
  getActivityCountByDate,
  getDailyAverage,
  getLogs,
  getMostLoggedActivity,
  getStreak,
  getTopActivities,
  getTotalLogs,
} from "@/lib/api/logs"

type DateRangeType = {
  from: Date
  to: Date
}

// Helper function to safely execute a promise and return a default value on error
async function safeExecute<T>(promise: Promise<T>, defaultValue: T, identifier: string): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    console.error(`Error fetching ${identifier}:`, error);
    // Optionally, log more details like userId if available contextually
    // Consider using a more robust logging library in production
    return defaultValue;
  }
}

export async function getDashboardData(
  userId: string,
  dateRange: DateRangeType
) {
  // Use safeExecute for each data fetching call
  const [logs, streak, totalLogs, mostLoggedActivity, activityCountByDate, topActivities, userActivities] = await Promise.all([
    safeExecute(getLogs(userId, dateRange, "user"), [], 'logs'),
    safeExecute(getStreak(userId, "user"), { currentStreak: 0, longestStreak: 0 }, 'streak'),
    safeExecute(getTotalLogs(userId, dateRange, "user"), 0, 'totalLogs'),
    safeExecute(getMostLoggedActivity(userId, dateRange), undefined, 'mostLoggedActivity'),
    safeExecute(getActivityCountByDate(userId, dateRange), [], 'activityCountByDate'),
    safeExecute(getTopActivities(userId, dateRange), [], 'topActivities'),
    safeExecute(getUserActivities(userId), [], 'userActivities'),
  ]);

  return {
    logs,
    streak,
    totalLogs,
    mostLoggedActivity,
    activityCountByDate,
    topActivities,
    userActivities,
  };
}

export async function getStatsDashboardData(
  activityId: string,
  dateRange: DateRangeType
) {
  // Example for getStatsDashboardData - adjust default values as needed
  const [logs, streak, totalLogs, dailyAverage] = await Promise.all([
    safeExecute(getLogs(activityId, dateRange, "activity"), [], 'statsLogs'),
    safeExecute(getStreak(activityId, "activity"), { currentStreak: 0, longestStreak: 0 }, 'statsStreak'),
    safeExecute(getTotalLogs(activityId, dateRange, "activity"), 0, 'statsTotalLogs'),
    safeExecute(getDailyAverage(activityId, dateRange), 0, 'statsDailyAverage'),
  ]);

  return {
    logs,
    streak,
    totalLogs,
    dailyAverage,
  };
}
