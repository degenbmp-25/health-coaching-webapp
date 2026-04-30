import { Metadata } from "next"
import { redirect } from "next/navigation"
import { format, parseISO } from "date-fns"

import { getCurrentUser } from "@/lib/session"
import { getUserMeals } from "@/lib/api/meals"

import { MealAddButton } from "@/components/meal/meal-add-button"
import { MealAddSimple } from "@/components/meal/meal-add-simple"
import { MealList } from "@/components/meal/meal-list"
import { MealCalendar } from "@/components/meal/meal-calendar"
import { Shell } from "@/components/layout/shell"
import { DashboardHeader } from "@/components/pages/dashboard/dashboard-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Icons } from "@/components/icons"

export const metadata: Metadata = {
  title: "Meals",
  description: "Track your meals and nutrition.",
}

export const dynamic = "force-dynamic"

interface MealsPageProps {
  searchParams: { date?: string }
}

export default async function MealsPage({ searchParams }: MealsPageProps) {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/signin")
  }

  // Get selected date from URL or use undefined for all meals
  const selectedDate = searchParams.date ? parseISO(searchParams.date) : undefined
  const meals = await getUserMeals(user.id, selectedDate)

  // Calculate totals
  const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0)

  return (
    <Shell>
      <DashboardHeader 
        heading="Meals" 
        text="Track your meals and nutrition."
      />
      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <MealCalendar meals={meals} />
        </div>
        <div>
          <Tabs defaultValue="detailed" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="detailed">Detailed Entry</TabsTrigger>
              <TabsTrigger value="simple">Quick Photo</TabsTrigger>
            </TabsList>
            <TabsContent value="detailed" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Icons.meal className="h-4 w-4" />
                    <span>{meals.length} meals</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Icons.fire className="h-4 w-4" />
                    <span>{totalCalories} calories</span>
                  </div>
                  {selectedDate && (
                    <div className="flex items-center gap-1">
                      <Icons.calendar className="h-4 w-4" />
                      <span>{format(selectedDate, 'MMM d, yyyy')}</span>
                    </div>
                  )}
                </div>
                <MealAddButton date={selectedDate} />
              </div>
              <MealList meals={meals} showDate={!selectedDate} />
            </TabsContent>
            <TabsContent value="simple" className="space-y-4">
              <Card className="p-6">
                <MealAddSimple />
              </Card>
              <MealList meals={meals} showDate={!selectedDate} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Shell>
  )
}
