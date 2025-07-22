"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useDropzone } from "react-dropzone"

import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { Icons } from "@/components/icons"
import { cn } from "@/lib/utils"

export function MealAddSimple() {
  const router = useRouter()
  const [isUploading, setIsUploading] = React.useState(false)

  const onDrop = React.useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    setIsUploading(true)
    const file = acceptedFiles[0]
    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await fetch("/api/meals/simple", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to upload meal")
      }

      toast({
        description: "Meal has been added successfully.",
      })

      router.refresh()
    } catch (error) {
      toast({
        title: "Something went wrong.",
        description: "Your meal was not added. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }, [router])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 1,
  })

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center",
        isDragActive && "border-primary bg-muted",
        isUploading && "pointer-events-none opacity-50"
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-2">
        <Icons.image className="h-8 w-8 text-muted-foreground" />
        <div className="text-sm font-medium">
          {isDragActive ? (
            <span>Drop the image here</span>
          ) : (
            <span>Drag & drop a meal photo, or click to select</span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          Supported formats: JPEG, PNG, WebP
        </div>
      </div>
      {isUploading && (
        <div className="mt-4 flex items-center gap-2">
          <Icons.spinner className="h-4 w-4 animate-spin" />
          <span className="text-sm">Uploading meal...</span>
        </div>
      )}
    </div>
  )
} 