import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { Webhook } from "svix"
import { db } from "@/lib/db"

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = await headers()
  const svixId = headerPayload.get("svix-id")
  const svixTimestamp = headerPayload.get("svix-timestamp")
  const svixSignature = headerPayload.get("svix-signature")

  // If there are no headers, error out
  if (!svixId || !svixTimestamp || !svixSignature) {
    return new NextResponse("Error occured -- no svix headers", {
      status: 400,
    })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Create a new Svix instance with your secret.
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || "")

  let evt: any

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as any
  } catch (err) {
    console.error("Error verifying webhook:", err)
    return new NextResponse("Error occured", {
      status: 400,
    })
  }

  // Handle the webhook
  const { id } = evt.data
  const eventType = evt.type

  if (eventType === "user.created") {
    try {
      await db.user.create({
        data: {
          clerkId: id,
          email: evt.data.email_addresses[0].email_address,
          name: `${evt.data.first_name || ""} ${evt.data.last_name || ""}`.trim(),
          image: evt.data.image_url,
          role: evt.data.public_metadata?.role || "user",
        },
      })
    } catch (error) {
      console.error("Error creating user:", error)
    }
  }

  if (eventType === "user.updated") {
    try {
      await db.user.update({
        where: {
          clerkId: id,
        },
        data: {
          email: evt.data.email_addresses[0].email_address,
          name: `${evt.data.first_name || ""} ${evt.data.last_name || ""}`.trim(),
          image: evt.data.image_url,
          role: evt.data.public_metadata?.role || "user",
        },
      })
    } catch (error) {
      console.error("Error updating user:", error)
    }
  }

  return new NextResponse("", { status: 200 })
} 