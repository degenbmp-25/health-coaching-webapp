import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { clerkClient } from "@clerk/nextjs/server"

export async function getCurrentUser() {
  const { userId } = await auth()
  
  if (!userId) {
    return null
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
          name: clerkUser.fullName || null,
          email: clerkUser.primaryEmailAddress?.emailAddress || '',
          image: clerkUser.imageUrl || null,
          role: 'user',
        },
      })
    }
  }

  return user
}
