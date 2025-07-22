"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import {
  Credenza,
  CredenzaClose,
  CredenzaContent,
  CredenzaDescription,
  CredenzaFooter,
  CredenzaHeader,
  CredenzaTitle,
} from "@/components/ui/credenza"
import { toast } from "@/components/ui/use-toast"
import { Icons } from "@/components/icons"

interface MealAddButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  variant?: "outline" | "default"
  className?: string
  date?: Date
}

export function MealAddButton({ variant = "default", className, date = new Date(), ...props }: MealAddButtonProps) {
  const router = useRouter()
  const [showAddAlert, setShowAddAlert] = React.useState<boolean>(false)
  const [isLoading, setIsLoading] = React.useState<boolean>(false)

  async function onClick() {
    setIsLoading(true)

    const response = await fetch("/api/meals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "New Meal",
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        date: date,
      }),
    })

    if (!response?.ok) {
      setIsLoading(false)
      setShowAddAlert(false)

      return toast({
        title: "Something went wrong.",
        description: "Your meal was not created. Please try again.",
        variant: "destructive",
      })
    }

    const meal = await response.json()

    toast({
      description: "A new meal has been created.",
    })

    setIsLoading(false)
    setShowAddAlert(false)
    router.push(`/dashboard/meals/${meal.id}/edit`)
    router.refresh()
  }

  return (
    <>
      <Button onClick={() => setShowAddAlert(true)} variant={variant} className={className} {...props}>
        <Icons.add className="mr-2 h-4 w-4" />
        New meal
      </Button>

      <Credenza open={showAddAlert} onOpenChange={setShowAddAlert}>
        <CredenzaContent>
          <CredenzaHeader>
            <CredenzaTitle>Add new meal</CredenzaTitle>
            <CredenzaDescription>
              Add a new meal for {format(date, "EEEE, MMMM d")}
            </CredenzaDescription>
          </CredenzaHeader>
          <CredenzaFooter className="flex flex-col-reverse">
            <CredenzaClose asChild>
              <Button variant="outline">Cancel</Button>
            </CredenzaClose>
            <Button onClick={onClick} disabled={isLoading}>
              {isLoading ? (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Icons.add className="mr-2 h-4 w-4" />
              )}
              <span>Add meal</span>
            </Button>
          </CredenzaFooter>
        </CredenzaContent>
      </Credenza>
    </>
  )
} 