import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function WorkoutSkeleton() {
  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </div>
          <Skeleton className="h-8 w-8" />
        </div>

        <div className="flex items-center gap-3 mb-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>

        <div className="space-y-1.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      </div>

      <div className="border-t p-3">
        <Button variant="default" size="sm" className="w-full" disabled>
          <Skeleton className="h-4 w-24" />
        </Button>
      </div>
    </Card>
  )
}
