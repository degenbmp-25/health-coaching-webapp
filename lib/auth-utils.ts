import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function getAuthenticatedUser() {
  const { userId } = await auth()
  
  if (!userId) {
    return null
  }

  const user = await db.user.findUnique({
    where: {
      clerkId: userId,
    },
  })

  return user
}

export async function requireAuth() {
  const user = await getAuthenticatedUser()
  
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  return user
}

export async function requireCoach() {
  const user = await requireAuth()
  
  if (user instanceof NextResponse) {
    return user
  }

  if (user.role !== "coach") {
    return new NextResponse("Forbidden - Coach access required", { status: 403 })
  }

  return user
} 