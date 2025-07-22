import { NextResponse } from "next/server"

import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const user = await requireAuth()

    if (user instanceof NextResponse) {
      return user
    }

    const { searchParams } = new URL(req.url)
    const query = searchParams.get("query") || ""
    const role = searchParams.get("role")
    
    // Build the where clause based on provided parameters
    const whereClause: any = {}
    
    // Filter by role if provided
    if (role) {
      whereClause.role = role as any;
    }
    
    // Add search filter if query is provided
    if (query) {
      whereClause.OR = [
        {
          name: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          email: {
            contains: query,
            mode: "insensitive",
          },
        },
      ]
    }
    
    // Never include the current user in search results
    whereClause.NOT = {
      id: user.id,
    }

    const users = await db.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true as any,
      },
      take: 10, // Limit to 10 results
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error("[USERS_SEARCH_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
} 