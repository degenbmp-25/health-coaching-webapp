"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/icons"

export function QuickActions() {
  const router = useRouter()
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center gap-1"
            onClick={() => router.push("/dashboard/messages")}
          >
            <Icons.message className="h-4 w-4 mr-1" />
            <span>Messages</span>
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center gap-1"
            onClick={() => router.push("/dashboard/coaching")}
          >
            <Icons.user className="h-4 w-4 mr-1" />
            <span>Coaching</span>
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center gap-1"
            onClick={() => router.push("/dashboard/workouts/new")}
          >
            <Icons.dumbbell className="h-4 w-4 mr-1" />
            <span>New Workout</span>
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center gap-1"
            onClick={() => router.push("/dashboard/meals/new")}
          >
            <Icons.meal className="h-4 w-4 mr-1" />
            <span>New Meal</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 