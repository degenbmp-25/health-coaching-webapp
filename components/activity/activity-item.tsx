"use client"

import Link from "next/link"
import { Activity } from "@prisma/client"

import { formatDate } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { ActivityOperations } from "@/components/activity/activity-operations"
import { QuickLogButton } from "@/components/activity/logs/quick-log-button"

interface ActivityItemProps {
  activity: Pick<
    Activity,
    "id" | "name" | "description" | "colorCode" | "createdAt"
  >
}

export function ActivityItem({ activity }: ActivityItemProps) {
  return (
    <div className="flex min-w-0 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex min-w-0 items-center gap-4 md:min-w-[8rem]">
          <div
            className="h-4 w-4 shrink-0 rounded-full shadow shadow-black dark:shadow-white"
            data-testid="color-code"
            style={{ backgroundColor: `${activity.colorCode}` }}
          ></div>
          <div className="min-w-0">
            <Link
              href={`/dashboard/activities/${activity.id}`}
              className="break-words font-semibold hover:underline"
            >
              {activity.name}
            </Link>
            <div>
              <p className="text-sm text-muted-foreground">
                {formatDate(activity.createdAt?.toDateString())}
              </p>
            </div>
          </div>
        </div>
        {activity.description ? (
          <div className="break-words text-sm text-muted-foreground">
            {activity.description}
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-2 sm:flex-col md:flex-row">
        <QuickLogButton
          activityId={activity.id}
          className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-muted"
          variant="outline"
          size="icon"
        />
        <ActivityOperations
          activity={{
            id: activity.id,
          }}
        />
      </div>
    </div>
  )
}

ActivityItem.Skeleton = function ActivityItemSkeleton() {
  return (
    <div className="p-4">
      <div className="space-y-3">
        <Skeleton className="h-5 w-2/5" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </div>
  )
}
