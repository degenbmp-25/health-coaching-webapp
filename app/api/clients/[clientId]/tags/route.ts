import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"

const routeContextSchema = z.object({
  params: z.object({
    clientId: z.string(),
  }),
})

/**
 * GET /api/clients/[clientId]/tags
 * List all tags used on this client.
 */
export async function GET(
  _req: Request,
  context: z.infer<typeof routeContextSchema>
) {
  try {
    const { params } = routeContextSchema.parse(context)
    const user = await requireAuth()

    if (user instanceof NextResponse) {
      return user
    }

    const clientId = params.clientId

    // ── Auth check ──────────────────────────────────────────────────────────
    const client = await db.user.findUnique({
      where: { id: clientId },
      select: {
        coachId: true,
        primaryTrainerId: true,
        organizationMemberships: { select: { role: true } },
      },
    })

    if (!client) {
      return new NextResponse("Client not found", { status: 404 })
    }

    const isCoachOfClient =
      client.coachId === user.id || client.primaryTrainerId === user.id
    const userIsOrgTrainer =
      client.organizationMemberships.some((m) =>
        ["owner", "trainer"].includes(m.role)
      )

    if (!isCoachOfClient && !userIsOrgTrainer) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    // ── Fetch tags ──────────────────────────────────────────────────────────
    const tags = await db.clientTag.findMany({
      where: { notes: { some: { note: { clientId } } } },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(tags)
  } catch (error) {
    console.error("[CLIENT_TAGS_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
