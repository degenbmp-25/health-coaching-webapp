import { z } from "zod"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"

const routeContextSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
})

type RouteContext = z.infer<typeof routeContextSchema>

// GET /api/organizations/:id/videos - Get all videos for an organization
export async function GET(
  req: Request,
  context: RouteContext
) {
  try {
    const { params } = routeContextSchema.parse(context)
    const user = await getCurrentUser()
    if (!user) {
      return new Response("Unauthorized", { status: 403 })
    }

    // Check if user is a member of this organization
    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: params.id,
          userId: user.id,
        },
      },
    })

    if (!membership) {
      return new Response("Forbidden", { status: 403 })
    }

    const videos = await db.organizationVideo.findMany({
      where: {
        organizationId: params.id,
        status: "ready",
      },
      select: {
        id: true,
        title: true,
        muxPlaybackId: true,
        thumbnailUrl: true,
        duration: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(videos)
  } catch (error) {
    console.error("Error fetching organization videos:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}
