"use client"

import { Meal } from "@prisma/client"

import { EmptyPlaceholder } from "@/components/empty-placeholder"
import { Icons } from "@/components/icons"
import { MealItem } from "./meal-item"

interface MealListProps {
  meals: Pick<Meal, "id" | "name" | "description" | "calories" | "protein" | "carbs" | "fat" | "date" | "imageUrl">[]
  showDate?: boolean
}

export function MealList({ meals, showDate = true }: MealListProps) {
  if (!meals?.length) {
    return (
      <EmptyPlaceholder>
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          <Icons.meal className="h-10 w-10" />
        </div>
        <EmptyPlaceholder.Title>No meals added</EmptyPlaceholder.Title>
        <EmptyPlaceholder.Description>
          Add your first meal to get started.
        </EmptyPlaceholder.Description>
      </EmptyPlaceholder>
    )
  }

  return (
    <div className="divide-y divide-border rounded-md border">
      {meals.map((meal) => (
        <MealItem key={meal.id} meal={meal} showDate={showDate} />
      ))}
    </div>
  )
} 