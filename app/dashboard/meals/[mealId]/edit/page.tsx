import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { getMeal } from "@/lib/api/meals"
import { getCurrentUser } from "@/lib/session"
import { MealEditForm } from "@/components/meal/meal-edit-form"
import { Shell } from "@/components/layout/shell"
import { DashboardHeader } from "@/components/pages/dashboard/dashboard-header"

export const metadata: Metadata = {
  title: "Edit Meal",
  description: "Edit your meal details.",
}

interface MealEditPageProps {
  params: { mealId: string }
}

export default async function MealEditPage({ params }: MealEditPageProps) {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/signin")
  }

  const meal = await getMeal(params.mealId, user.id)

  if (!meal) {
    notFound()
  }

  return (
    <Shell>
      <DashboardHeader
        heading="Edit Meal"
        text="Edit your meal details."
      />
      <div className="grid gap-10">
        <MealEditForm
          meal={{
            id: meal.id,
            name: meal.name,
            description: meal.description,
            imageUrl: meal.imageUrl,
            calories: meal.calories,
            protein: meal.protein,
            carbs: meal.carbs,
            fat: meal.fat,
            date: meal.date,
          }}
        />
      </div>
    </Shell>
  )
} 