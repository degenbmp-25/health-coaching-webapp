"use client"

import { useEffect } from "react"
import { ErrorCard } from "@/components/ui/error-card"

export default function WorkoutsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Error is already logged via Next.js error reporting
  useEffect(() => {
    // Could integrate with error reporting service here (e.g., Sentry)
  }, [error])

  return (
    <div className="grid items-start gap-4 sm:gap-6 md:gap-8 px-4 sm:px-6 md:px-0">
      <ErrorCard
        title="Failed to load workouts"
        description="Something went wrong while loading your workouts. Please try again."
        onRetry={reset}
      />
    </div>
  )
}
