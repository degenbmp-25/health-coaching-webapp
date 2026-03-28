"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Icons } from "@/components/icons"

interface ErrorCardProps {
  title?: string
  description?: string
  onRetry?: () => void
}

export function ErrorCard({
  title = "Something went wrong",
  description = "An error occurred while loading this content.",
  onRetry,
}: ErrorCardProps) {
  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Icons.warning className="h-5 w-5 text-destructive" />
          <CardTitle className="text-destructive">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription>{description}</CardDescription>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" className="mt-4">
            <Icons.spinner className="mr-2 h-4 w-4" />
            Try again
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
