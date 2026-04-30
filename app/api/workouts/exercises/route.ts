import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-utils"

import { getExercises } from "@/lib/api/workouts"

export const dynamic = 'force-dynamic'

export async function GET() {
  const authRes = await requireAuth();
  if (authRes instanceof NextResponse) return authRes;
  try {
    const exercises = await getExercises(authRes.id)
    
    return NextResponse.json(exercises)
  } catch (error) {
    console.error("[EXERCISES_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
