import { WorkoutSkeleton } from "./workout-skeleton"

export function WorkoutListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <WorkoutSkeleton key={i} />
      ))}
    </div>
  )
}
