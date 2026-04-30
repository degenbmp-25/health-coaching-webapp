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
 * GET /api/clients/[clientId]/profile
 * Aggregate full client profile from all connected data sources.
 * Auth: requester must be coach of this client (org role or coachId).
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

    // ── Auth check: requester must be coach of this client ──────────────────
    const client = await db.user.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        coachId: true,
        primaryTrainerId: true,
        organizationMemberships: {
          select: { organizationId: true, role: true },
        },
      },
    })

    if (!client) {
      return new NextResponse("Client not found", { status: 404 })
    }

    const isCoachOfClient =
      client.coachId === user.id ||
      client.primaryTrainerId === user.id

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

    // ── Fetch aggregated data ────────────────────────────────────────────────

    // Recent workout sessions (last 5)
    const recentSessions = await db.workoutSession.findMany({
      where: { userId: clientId },
      orderBy: { startedAt: "desc" },
      take: 5,
      select: {
        id: true,
        status: true,
        startedAt: true,
        completedAt: true,
        workout: { select: { id: true, name: true } },
      },
    })

    // Active programs
    const programs = await db.programAssignment.findMany({
      where: { clientId },
      orderBy: { startedAt: "desc" },
      include: {
        program: {
          select: {
            id: true,
            name: true,
            description: true,
            workouts: {
              select: { id: true, name: true },
              take: 3,
            },
          },
        },
      },
    })

    // Activity streak (current and longest from activity logs)
    const activityLogs = await db.activityLog.findMany({
      where: {
        activity: { userId: clientId },
      },
      orderBy: { date: "desc" },
      select: { date: true, activityId: true },
    })

    let currentStreak = 0
    let longestStreak = 0
    if (activityLogs.length > 0) {
      // Build a set of unique dates (YYYY-MM-DD)
      const dateSet = new Set(
        activityLogs.map((l) => l.date.toISOString().split("T")[0])
      )
      const sortedDates = Array.from(dateSet).sort().reverse()

      // Current streak: consecutive days ending today or yesterday
      const today = new Date()
      const checkDate = new Date(today)
      while (true) {
        const dateStr = checkDate.toISOString().split("T")[0]
        if (dateSet.has(dateStr)) {
          currentStreak++
          checkDate.setDate(checkDate.getDate() - 1)
        } else {
          break
        }
      }

      // Longest streak: count consecutive dates
      let streak = 1
      for (let i = 1; i < sortedDates.length; i++) {
        const prev = new Date(sortedDates[i - 1])
        const curr = new Date(sortedDates[i])
        const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24)
        if (diff === 1) {
          streak++
          longestStreak = Math.max(longestStreak, streak)
        } else {
          longestStreak = Math.max(longestStreak, streak)
          streak = 1
        }
      }
      longestStreak = Math.max(longestStreak, currentStreak, streak)
    }

    // Recent meals (last 5)
    const recentMeals = await db.meal.findMany({
      where: { userId: clientId },
      orderBy: { date: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        calories: true,
        protein: true,
        date: true,
      },
    })

    // Active goals
    const goals = await db.goal.findMany({
      where: { userId: clientId, isCompleted: false },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        description: true,
        targetDate: true,
      },
    })

    // Coach notes (all notes for this client, newest first)
    const notes = await db.clientNote.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { id: true, name: true, image: true } },
        tags: { include: { tag: true } },
      },
    })

    // All tags used on this client
    const tags = await db.clientTag.findMany({
      where: { notes: { some: { note: { clientId } } } },
    })

    // Pinned facts (pinned notes)
    const pinnedFacts = notes.filter((n) => n.isPinned)

    // Last 5 Discord messages (via Conversation model)
    // Find conversations where client is a participant
    const conversations = await db.conversation.findMany({
      where: {
        participants: { some: { id: clientId } },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            sender: { select: { id: true, name: true, image: true } },
          },
        },
      },
    })

    const conversationSummaries = conversations
      .filter((c) => c.messages.length > 0)
      .map((c) => ({
        id: c.id,
        lastMessage: c.messages[0].content.substring(0, 200),
        sentAt: c.messages[0].createdAt,
        sender: c.messages[0].sender,
        updatedAt: c.updatedAt,
      }))

    return NextResponse.json({
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        image: client.image,
      },
      progress: {
        recentSessions,
        programs,
        activityStreak: { current: currentStreak, longest: longestStreak },
        recentMeals,
        goals,
      },
      notes: notes.map((n) => ({
        id: n.id,
        content: n.content,
        noteType: n.noteType,
        isPinned: n.isPinned,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
        author: n.author,
        tags: n.tags.map((nt) => nt.tag),
      })),
      tags,
      conversations: conversationSummaries,
      pinnedFacts: pinnedFacts.map((n) => ({
        id: n.id,
        content: n.content,
        noteType: n.noteType,
        createdAt: n.createdAt,
        author: n.author,
        tags: n.tags.map((nt) => nt.tag),
      })),
    })
  } catch (error) {
    console.error("[CLIENT_PROFILE_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
