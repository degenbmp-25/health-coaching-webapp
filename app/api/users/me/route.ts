import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { clerkClient } from "@clerk/nextjs/server"

export async function GET() {
  const { userId } = await auth()
  
  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  let user = await db.user.findUnique({
    where: {
      clerkId: userId,
    },
  })

  if (!user) {
    const clerkUser = await clerkClient.users.getUser(userId)
    if (clerkUser) {
      user = await db.user.create({
        data: {
          clerkId: userId,
          email: clerkUser.emailAddresses[0]?.emailAddress || "",
          name: `${clerkUser.firstName} ${clerkUser.lastName}`.trim(),
          image: clerkUser.imageUrl,
        },
      })
    }
  }

  return NextResponse.json(user)
}
