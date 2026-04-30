type ExerciseOption = {
  id: string
  name: string
  description?: string | null
  category: string
  muscleGroup: string
  equipment?: string | null
  userId?: string | null
  createdAt?: Date
  _count?: {
    workoutExercises?: number
  }
}

function normalizeExerciseValue(value: string | null | undefined) {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
}

function getExerciseDedupeKey(exercise: ExerciseOption) {
  return [
    normalizeExerciseValue(exercise.name),
    normalizeExerciseValue(exercise.category),
    normalizeExerciseValue(exercise.muscleGroup),
    normalizeExerciseValue(exercise.equipment),
  ].join("|")
}

function shouldReplaceExerciseOption(current: ExerciseOption, candidate: ExerciseOption) {
  const currentUsage = current._count?.workoutExercises ?? 0
  const candidateUsage = candidate._count?.workoutExercises ?? 0

  if (candidateUsage !== currentUsage) {
    return candidateUsage > currentUsage
  }

  if (candidate.userId === null && current.userId !== null) {
    return true
  }

  if (candidate.createdAt && current.createdAt) {
    return candidate.createdAt < current.createdAt
  }

  return candidate.id < current.id
}

export function dedupeExerciseOptions<T extends ExerciseOption>(exercises: T[]) {
  const byKey = new Map<string, T>()

  for (const exercise of exercises) {
    const key = getExerciseDedupeKey(exercise)
    const current = byKey.get(key)

    if (!current || shouldReplaceExerciseOption(current, exercise)) {
      byKey.set(key, exercise)
    }
  }

  return Array.from(byKey.values()).sort((a, b) => {
    const categoryCompare = a.category.localeCompare(b.category)
    if (categoryCompare !== 0) return categoryCompare

    const muscleCompare = a.muscleGroup.localeCompare(b.muscleGroup)
    if (muscleCompare !== 0) return muscleCompare

    return a.name.localeCompare(b.name)
  })
}
