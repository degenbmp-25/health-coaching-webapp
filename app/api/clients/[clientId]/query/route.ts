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
 * GET /api/clients/[clientId]/query?q=How+is+Kevin+progressing
 * Smart keyword router — maps natural-language-style queries to structured DB queries.
 * NOT a full LLM. Pattern-matches keywords against structured data.
 */
export async function GET(
  req: Request,
  context: z.infer<typeof routeContextSchema>
) {
  try {
    const { params } = routeContextSchema.parse(context)
    const user = await requireAuth()

    if (user instanceof NextResponse) {
      return user
    }

    const clientId = params.clientId
    const { searchParams } = new URL(req.url)
    const rawQuery = searchParams.get("q") || ""

    // Server-side query length validation
    if (rawQuery.length > 500) {
      return new NextResponse(
        JSON.stringify({ message: "Query too long. Maximum 500 characters." }),
        { status: 400 }
      )
    }

    const query = rawQuery.toLowerCase().trim()

    // ── Auth check ──────────────────────────────────────────────────────────
    const client = await db.user.findUnique({
      where: { id: clientId },
      select: {
        name: true,
        coachId: true,
        primaryTrainerId: true,
        organizationMemberships: { select: { organizationId: true } },
      },
    })

    if (!client) {
      return new NextResponse("Client not found", { status: 404 })
    }

    const isCoachOfClient =
      client.coachId === user.id || client.primaryTrainerId === user.id
    const clientOrgIds = client.organizationMemberships.map((m) => m.organizationId)
    const requesterOrgTrainer =
      clientOrgIds.length > 0
        ? await db.organizationMember.findFirst({
            where: {
              userId: user.id,
              organizationId: { in: clientOrgIds },
              role: { in: ["owner", "trainer"] },
            },
            select: { id: true },
          })
        : null

    if (!isCoachOfClient && !requesterOrgTrainer) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    // ── Smart keyword router ────────────────────────────────────────────────
    let answer = ""
    let sources: string[] = []
    let data: Record<string, any> = {}

    // Pattern: progress
    if (/progress|how\s*is|how\s*are\s*\w+\s*do(ing|es)/.test(query)) {
      const sessions = await db.workoutSession.findMany({
        where: { userId: clientId },
        orderBy: { startedAt: "desc" },
        take: 5,
        include: { workout: { select: { name: true } } },
      })
      const goals = await db.goal.findMany({
        where: { userId: clientId, isCompleted: false },
        orderBy: { createdAt: "desc" },
        take: 5,
      })
      const clientName = client.name || "this client"
      const completedCount = sessions.filter(
        (s) => s.status === "completed"
      ).length
      answer = `${clientName} has completed ${completedCount} of ${sessions.length} recent workouts. Active goals: ${goals.length > 0 ? goals.map((g) => g.title).join(", ") : "none set"}.`
      sources = ["workout_sessions", "goals"]
      data = { sessions, goals }
    }
    // Pattern: injury / pain
    else if (/injury|pain|hurt|hurt(s|ing)?/.test(query)) {
      const injuryNotes = await db.clientNote.findMany({
        where: { clientId, noteType: "injury" },
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { name: true } },
          tags: { include: { tag: true } },
        },
      })
      answer =
        injuryNotes.length > 0
          ? `Found ${injuryNotes.length} injury-related note(s):\n${injuryNotes.map((n) => `- ${n.content}`).join("\n")}`
          : "No injury-related notes found for this client."
      sources = ["client_notes"]
      data = { injuryNotes }
    }
    // Pattern: concern
    else if (/concern|worry|issue/.test(query)) {
      const concernNotes = await db.clientNote.findMany({
        where: { clientId, noteType: "concern" },
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { name: true } },
          tags: { include: { tag: true } },
        },
      })
      answer =
        concernNotes.length > 0
          ? `Found ${concernNotes.length} concern(s):\n${concernNotes.map((n) => `- ${n.content}`).join("\n")}`
          : "No flagged concerns found for this client."
      sources = ["client_notes"]
      data = { concernNotes }
    }
    // Pattern: goals
    else if (/goal/.test(query)) {
      const goals = await db.goal.findMany({
        where: { userId: clientId, isCompleted: false },
        orderBy: { createdAt: "desc" },
      })
      answer =
        goals.length > 0
          ? `Active goals:\n${goals.map((g, i) => `${i + 1}. ${g.title}${g.description ? ` - ${g.description}` : ""}`).join("\n")}`
          : "No active goals found."
      sources = ["goals"]
      data = { goals }
    }
    // Pattern: recent / last sessions
    else if (/recent|last\s*\d?/.test(query)) {
      const sessions = await db.workoutSession.findMany({
        where: { userId: clientId },
        orderBy: { startedAt: "desc" },
        take: 5,
        include: { workout: { select: { name: true } } },
      })
      answer =
        sessions.length > 0
          ? `Last ${sessions.length} workout sessions:\n${sessions.map((s) => `- ${s.workout.name} (${s.status}) on ${new Date(s.startedAt).toLocaleDateString()}`).join("\n")}`
          : "No recent workout sessions found."
      sources = ["workout_sessions"]
      data = { sessions }
    }
    // Pattern: sleep / nutrition / diet
    else if (/sleep|nutrition|diet|meal/.test(query)) {
      const nutritionNotes = await db.clientNote.findMany({
        where: { clientId },
        include: {
          tags: { include: { tag: true } },
          author: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
      const relevantNotes = nutritionNotes.filter((n) =>
        ["sleep", "nutrition", "diet", "meal"].some((kw) =>
          n.tags.some((t) => t.tag.name.toLowerCase().includes(kw))
        ) ||
          /sleep|nutrition|diet|meal/.test(n.content.toLowerCase())
      )
      const meals = await db.meal.findMany({
        where: { userId: clientId },
        orderBy: { date: "desc" },
        take: 5,
      })
      answer =
        relevantNotes.length > 0
          ? `Nutrition/sleep notes:\n${relevantNotes.map((n) => `- ${n.content}`).join("\n")}`
          : "No specific nutrition or sleep notes found."
      if (meals.length > 0) {
        answer += `\n\nRecent meals logged: ${meals.map((m) => m.name).join(", ")}`
      }
      sources = ["client_notes", "meals"]
      data = { notes: relevantNotes, meals }
    }
    // Pattern: everything / summary / all
    else if (/everything|summary|all\s*(about|info)/.test(query)) {
      const [sessions, goals, pinnedNotes, tags] = await Promise.all([
        db.workoutSession.findMany({
          where: { userId: clientId },
          orderBy: { startedAt: "desc" },
          take: 5,
          include: { workout: { select: { name: true } } },
        }),
        db.goal.findMany({
          where: { userId: clientId, isCompleted: false },
        }),
        db.clientNote.findMany({
          where: { clientId, isPinned: true },
          orderBy: { createdAt: "desc" },
          include: {
            author: { select: { name: true } },
            tags: { include: { tag: true } },
          },
        }),
        db.clientTag.findMany({
          where: { notes: { some: { note: { clientId } } } },
        }),
      ])

      const clientName = client.name || "This client"
      const streak = sessions.length > 0 ? "active" : "none"
      answer = `Summary for ${clientName}:\n- Recent workouts: ${sessions.length}\n- Active goals: ${goals.length}\n- Tagged facts: ${tags.length}\n- Pinned notes: ${pinnedNotes.length}`
      sources = ["workout_sessions", "goals", "client_notes"]
      data = { sessions, goals, pinnedNotes, tags }
    }
    // Fallback: no pattern matched
    else {
      answer =
        "I didn't understand that. Try asking about: progress, injuries, goals, concerns, recent workouts, or sleep/nutrition."
      sources = []
      data = {}
    }

    return NextResponse.json({ answer, sources, data })
  } catch (error) {
    console.error("[CLIENT_QUERY_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
