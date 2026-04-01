import { db } from "@/lib/db"
import { auth } from "@clerk/nextjs/server"

export async function getClerkUserId(): Promise<string | null> {
  const { userId } = auth()
  return userId
}

export async function getCurrentDbUser() {
  const clerkId = await getClerkUserId()
  if (!clerkId) return null
  return db.user.findFirst({ where: { clerkId } })
}

export async function resolveClerkIdToDbUserId(clerkId: string): Promise<string | null> {
  const user = await db.user.findFirst({ where: { clerkId }, select: { id: true } })
  return user?.id ?? null
}

export async function requireDbUser() {
  const user = await getCurrentDbUser()
  if (!user) throw new Error("Unauthorized")
  return user
}

export function isCoachOrTrainer(role: string | null): boolean {
  return role === "coach" || role === "trainer" || role === "owner"
}
