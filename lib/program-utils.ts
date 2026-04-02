/**
 * Program Utilities - Date calculations for variable-week programs
 */

/**
 * Calculate the current week number based on start date and today
 * @param startDate - Program start date
 * @param totalWeeks - Total program duration in weeks
 * @returns Current week number (1-based) or null if can't calculate
 */
export function calculateCurrentWeek(
  startDate: Date | string | null,
  totalWeeks: number | null
): number | null {
  if (!startDate || totalWeeks === null || totalWeeks <= 0) {
    return null
  }

  const start = new Date(startDate)
  const now = new Date()

  // Reset time portions for accurate day calculation
  start.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)

  // Calculate days since start
  const diffTime = now.getTime() - start.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    // Program hasn't started yet
    return 0
  }

  const currentWeek = Math.floor(diffDays / 7) + 1

  if (currentWeek > totalWeeks) {
    // Program is complete
    return totalWeeks + 1
  }

  return currentWeek
}

/**
 * Calculate the scheduled date for a workout
 * @param program - Program with startDate and totalWeeks
 * @param workout - Workout with weekNumber, dayOfWeek, and optional scheduledDate
 * @returns Calculated date or null if not calculable
 */
export function calculateWorkoutDate(
  program: { startDate: Date | string | null; totalWeeks: number | null },
  workout: { scheduledDate: Date | string | null; weekNumber: number | null; dayOfWeek: number | null }
): Date | null {
  // If workout has explicit scheduled date, use it
  if (workout.scheduledDate) {
    return new Date(workout.scheduledDate)
  }

  // If no start date, can't calculate
  if (!program.startDate) {
    return null
  }

  // If no week number, can't calculate
  if (workout.weekNumber === null || workout.weekNumber === undefined) {
    return null
  }

  const start = new Date(program.startDate)
  start.setHours(0, 0, 0, 0)

  // Calculate date: startDate + ((weekNumber - 1) * 7) + dayOfWeek days
  const daysToAdd = (workout.weekNumber - 1) * 7 + (workout.dayOfWeek ?? 0)
  const workoutDate = new Date(start.getTime() + daysToAdd * 24 * 60 * 60 * 1000)

  return workoutDate
}

/**
 * Format week display string
 * @param weekNumber - Current week number
 * @param totalWeeks - Total weeks in program
 * @returns Formatted string like "Week 3 of 8"
 */
export function formatWeekDisplay(
  weekNumber: number | null,
  totalWeeks: number | null
): string {
  if (weekNumber === null || totalWeeks === null) {
    return "Week 0 of 0"
  }
  return `Week ${weekNumber} of ${totalWeeks}`
}

/**
 * Get day name from day number
 * @param dayOfWeek - Day number (0=Sun to 6=Sat)
 * @returns Day name
 */
export function getDayName(dayOfWeek: number | null): string {
  if (dayOfWeek === null || dayOfWeek === undefined) {
    return ""
  }
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  return days[dayOfWeek] ?? ""
}

/**
 * Format date for display
 * @param date - Date to format
 * @returns Formatted date string (e.g., "Apr 15")
 */
export function formatDate(date: Date | null): string {
  if (!date) return ""
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}
