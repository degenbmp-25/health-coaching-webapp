"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Target, Activity, Dumbbell, Plus } from "lucide-react"
import Link from "next/link"

interface WelcomeCardProps {
  userName?: string
}

export function WelcomeCard({ userName }: WelcomeCardProps) {
  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-900 border-blue-200 dark:border-blue-800">
      <CardHeader>
        <CardTitle className="text-2xl">
          Welcome back{userName ? `, ${userName}` : ''}! 👋
        </CardTitle>
        <CardDescription className="text-base">
          Ready to continue your fitness journey? Here&apos;s a quick overview of your options.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/dashboard/goals">
            <Button variant="outline" className="w-full h-20 flex flex-col gap-2 hover:bg-blue-50 dark:hover:bg-blue-950">
              <Target className="h-6 w-6" />
              <span className="text-sm font-medium">Set Goals</span>
            </Button>
          </Link>
          <Link href="/dashboard/activities">
            <Button variant="outline" className="w-full h-20 flex flex-col gap-2 hover:bg-blue-50 dark:hover:bg-blue-950">
              <Activity className="h-6 w-6" />
              <span className="text-sm font-medium">Track Activities</span>
            </Button>
          </Link>
          <Link href="/dashboard/workouts">
            <Button variant="outline" className="w-full h-20 flex flex-col gap-2 hover:bg-blue-50 dark:hover:bg-blue-950">
              <Dumbbell className="h-6 w-6" />
              <span className="text-sm font-medium">Plan Workouts</span>
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
} 