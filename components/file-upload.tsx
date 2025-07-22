"use client"

import { useCallback } from "react"
import { useDropzone } from "react-dropzone"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Icons } from "@/components/icons"

interface FileUploadProps {
  endpoint: "mealImage"
  value?: string
  onChange: (url?: string) => void
}

export function FileUpload({ endpoint, value, onChange }: FileUploadProps) {
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      try {
        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch(`/api/upload/${endpoint}`, {
          method: "POST",
          body: formData,
        })

        if (!response.ok) throw new Error("Upload failed")

        const data = await response.json()
        onChange(data.url)
      } catch (error) {
        console.error("Upload error:", error)
      }
    }
  }, [endpoint, onChange])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif']
    },
    maxFiles: 1,
  })

  return (
    <div>
      {value ? (
        <div className="relative h-40 w-40">
          <Image
            src={value}
            alt="Uploaded image"
            fill
            className="rounded-md object-cover"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute -right-2 -top-2"
            onClick={() => onChange(undefined)}
          >
            <Icons.trash className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed p-8 hover:bg-muted"
        >
          <input {...getInputProps()} />
          <Icons.upload className="mb-2 h-6 w-6" />
          <p className="text-sm text-muted-foreground">
            {isDragActive
              ? "Drop the image here"
              : "Drag & drop an image here, or click to select"}
          </p>
        </div>
      )}
    </div>
  )
} 