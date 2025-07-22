import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-utils"
import { v2 as cloudinary } from "cloudinary"
import { UploadApiResponse } from "cloudinary"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(req: Request) {
  try {
    const authRes = await requireAuth();
    if (authRes instanceof NextResponse) return authRes;
    const currentUser = authRes;

    const formData = await req.formData()
    const file = formData.get("file") as File
    
    if (!file) {
      return new Response("No file provided", { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: "meals",
          },
          (error, result) => {
            if (error) reject(error)
            if (result) resolve(result)
          }
        )
        .end(buffer)
    })

    return new Response(JSON.stringify({ url: result.secure_url }))
  } catch (error) {
    console.error("Upload error:", error)
    return new Response("Internal error", { status: 500 })
  }
} 