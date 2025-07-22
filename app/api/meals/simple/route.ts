import { NextResponse } from "next/server"
import { v2 as cloudinary } from "cloudinary"

import { getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new NextResponse("Unauthorized", { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File
    if (!file) {
      return new NextResponse("No file uploaded", { status: 400 })
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const fileBase64 = `data:${file.type};base64,${buffer.toString('base64')}`

    // Upload to Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(fileBase64, {
      folder: "meals",
    })

    // Create meal with default values
    const meal = await db.meal.create({
      data: {
        name: "Quick Meal",
        imageUrl: uploadResponse.secure_url,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        userId: user.id,
      },
    })

    return NextResponse.json(meal)
  } catch (error) {
    console.error("Error uploading meal:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
} 