"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { Meal } from "@prisma/client"
import * as React from "react"

import { formatDate } from "@/lib/utils"
import { MealOperations } from "./meal-operations"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"

interface MealItemProps {
  meal: Pick<Meal, "id" | "name" | "description" | "calories" | "protein" | "carbs" | "fat" | "date" | "imageUrl">
  showDate?: boolean
}

interface EditableNutritionProps {
  label: string
  value: number
  onSubmit: (value: number) => void
  unit?: string
}

function EditableNutrition({ label, value, onSubmit, unit = "" }: EditableNutritionProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [currentValue, setCurrentValue] = React.useState(value.toString())

  const handleSubmit = () => {
    const numValue = parseFloat(currentValue)
    if (isNaN(numValue) || numValue < 0) {
      toast({
        title: "Invalid value",
        description: "Please enter a valid number.",
        variant: "destructive",
      })
      setCurrentValue(value.toString())
      setIsEditing(false)
      return
    }
    onSubmit(numValue)
    setIsEditing(false)
  }

  return isEditing ? (
    <Input
      type="number"
      min="0"
      step="0.1"
      value={currentValue}
      onChange={(e) => setCurrentValue(e.target.value)}
      onBlur={handleSubmit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          handleSubmit()
        } else if (e.key === "Escape") {
          setCurrentValue(value.toString())
          setIsEditing(false)
        }
      }}
      className="h-6 w-20 py-1 px-1 text-sm"
      autoFocus
    />
  ) : (
    <div
      className="cursor-pointer hover:text-primary"
      onClick={() => setIsEditing(true)}
    >
      {label}: {value}{unit}
    </div>
  )
}

export function MealItem({ meal, showDate = true }: MealItemProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = React.useState(false)
  const [name, setName] = React.useState(meal.name)
  const [nutrition, setNutrition] = React.useState({
    calories: meal.calories,
    protein: meal.protein,
    carbs: meal.carbs,
    fat: meal.fat,
  })

  const updateMeal = async (updates: Partial<typeof nutrition> & { name?: string }) => {
    const response = await fetch(`/api/meals/${meal.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: updates.name || name,
        description: meal.description || "",
        imageUrl: meal.imageUrl || "",
        calories: updates.calories ?? nutrition.calories,
        protein: updates.protein ?? nutrition.protein,
        carbs: updates.carbs ?? nutrition.carbs,
        fat: updates.fat ?? nutrition.fat,
        date: meal.date,
      }),
    })

    if (!response.ok) {
      toast({
        title: "Something went wrong.",
        description: "Your meal was not updated. Please try again.",
        variant: "destructive",
      })
      return false
    }
    
    toast({
      description: "Meal updated.",
    })
    router.refresh()
    return true
  }

  const handleNameSubmit = async () => {
    if (name.length < 3) {
      toast({
        title: "Name too short",
        description: "Name must be at least 3 characters.",
        variant: "destructive",
      })
      setName(meal.name)
      setIsEditing(false)
      return
    }

    const success = await updateMeal({ name })
    if (!success) {
      setName(meal.name)
    }
    setIsEditing(false)
  }

  const handleNutritionUpdate = async (key: keyof typeof nutrition, value: number) => {
    const success = await updateMeal({ [key]: value })
    if (success) {
      setNutrition(prev => ({ ...prev, [key]: value }))
    }
  }

  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex gap-4">
        {meal.imageUrl && (
          <div className="relative h-20 w-20 overflow-hidden rounded-md">
            <Image
              src={meal.imageUrl}
              alt={name}
              fill
              className="object-cover"
            />
          </div>
        )}
        <div className="grid gap-1">
          {isEditing ? (
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleNameSubmit}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleNameSubmit()
                } else if (e.key === "Escape") {
                  setName(meal.name)
                  setIsEditing(false)
                }
              }}
              className="h-6 py-1 px-1"
              autoFocus
            />
          ) : (
            <div 
              className="font-semibold cursor-pointer hover:text-primary"
              onClick={() => setIsEditing(true)}
            >
              {name}
            </div>
          )}
          {showDate && (
            <div className="text-sm text-muted-foreground">
              {formatDate(meal.date.toDateString())}
            </div>
          )}
          {meal.description && (
            <div className="text-sm text-muted-foreground">{meal.description}</div>
          )}
          <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
            <EditableNutrition
              label="Calories"
              value={nutrition.calories}
              onSubmit={(value) => handleNutritionUpdate('calories', value)}
            />
            <EditableNutrition
              label="Protein"
              value={nutrition.protein}
              onSubmit={(value) => handleNutritionUpdate('protein', value)}
              unit="g"
            />
            <EditableNutrition
              label="Carbs"
              value={nutrition.carbs}
              onSubmit={(value) => handleNutritionUpdate('carbs', value)}
              unit="g"
            />
            <EditableNutrition
              label="Fat"
              value={nutrition.fat}
              onSubmit={(value) => handleNutritionUpdate('fat', value)}
              unit="g"
            />
          </div>
        </div>
      </div>
      <MealOperations meal={{ id: meal.id }} />
    </div>
  )
} 