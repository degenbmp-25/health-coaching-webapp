import { NextResponse } from "next/server"
import { clerkClient } from "@clerk/nextjs/server"

import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"

export async function PATCH(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const user = await requireAuth()

    if (user instanceof NextResponse) {
      return user
    }

    // Only users can change their own role
    // Compare Clerk IDs since the frontend sends Clerk ID
    if (user.clerkId !== params.userId) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const { role } = await req.json()

    if (!role || (role !== "user" && role !== "coach")) {
      return new NextResponse("Invalid role. Must be 'user' or 'coach'", {
        status: 400,
      })
    }

    const updatedUser = await db.user.update({
      where: {
        clerkId: params.userId,
      },
      data: {
        role: role as string,
      },
    })

    // Update Clerk user metadata to sync the role
    const clerk = await clerkClient()
    await clerk.users.updateUserMetadata(params.userId, {
      publicMetadata: {
        role: role,
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error("[USER_ROLE_PATCH]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
} 