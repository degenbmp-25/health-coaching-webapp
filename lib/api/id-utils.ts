import { db } from "@/lib/db"
import { auth } from "@clerk/nextjs/server"

export async function getClerkUserId(): Promise<string | null> {
  const { userId } = auth()
  return userId
}

export async function getCurrentDbUser() {
  const clerkId = await getClerkUserId()
  if (!clerkId) return null
  return db.user.findUnique({ where: { clerkId } })
}

/**
 * Resolves any user ID (Clerk ID or Database CUID) to a Database CUID.
 * 
 * - If input starts with 'user_' (Clerk ID format): resolves via clerkId field
 * - If input starts with 'clnd' (CUID format): verifies user exists and returns
 * - Otherwise: returns null
 */
export async function resolveClerkIdToDbUserId(id: string): Promise<string | null> {
  try {
    // If already a CUID (starts with 'clnd'), verify user exists and return
    if (id.startsWith('clnd')) {
      const user = await db.user.findUnique({ where: { id }, select: { id: true } })
      return user?.id ?? null
    }
    
    // If Clerk ID (starts with 'user_'), resolve via clerkId field
    if (id.startsWith('user_')) {
      const user = await db.user.findFirst({ where: { clerkId: id }, select: { id: true } })
      return user?.id ?? null
    }
    
    // Unknown format - try as CUID anyway for safety
    console.warn(`[resolveClerkIdToDbUserId] Unknown ID format: ${id}`)
    const user = await db.user.findUnique({ where: { id }, select: { id: true } })
    return user?.id ?? null
  } catch (error) {
    console.error("[resolveClerkIdToDbUserId]", error)
    return null
  }
}

export async function requireDbUser() {
  const user = await getCurrentDbUser()
  if (!user) throw new Error("Unauthorized")
  return user
}

export function isCoachOrTrainer(role: string | null): boolean {
  return role === "coach" || role === "trainer" || role === "owner"
}
