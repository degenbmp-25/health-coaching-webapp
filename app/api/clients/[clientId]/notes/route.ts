import { NextResponse } from "next/server"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"

const routeContextSchema = z.object({
  params: z.object({
    clientId: z.string(),
  }),
})

const noteNoteTypeEnum = z.enum([
  "general",
  "injury",
  "observation",
  "goal_update",
  "concern",
])

const noteQuerySchema = z.object({
  tag: z.string().optional(),
  limit: z
    .string()
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().min(1).max(100))
    .optional()
    .default("20"),
  offset: z
    .string()
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().min(0).max(10000))
    .optional()
    .default("0"),
  type: noteNoteTypeEnum.optional(),
})

/**
 * GET /api/clients/[clientId]/notes
 * List all notes for a client.
 * Query params: ?tag=injury&limit=20&offset=0&type=observation
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

    const queryResult = noteQuerySchema.safeParse({
      tag: searchParams.get("tag"),
      limit: searchParams.get("limit"),
      offset: searchParams.get("offset"),
      type: searchParams.get("type"),
    })

    if (!queryResult.success) {
      return new NextResponse(
        JSON.stringify({
          message: "Validation failed",
          errors: queryResult.error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        }),
        { status: 400 }
      )
    }

    const { tag, limit, offset, type: noteType } = queryResult.data

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

    // ── Build typed query ────────────────────────────────────────────────────
    const where: Prisma.ClientNoteWhereInput = {
      clientId,
    }

    if (noteType) {
      where.noteType = noteType
    }

    if (tag) {
      where.tags = { some: { tag: { name: tag } } }
    }

    const [notes, total] = await Promise.all([
      db.clientNote.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
        include: {
          author: { select: { id: true, name: true, image: true } },
          tags: { include: { tag: true } },
        },
      }),
      db.clientNote.count({ where }),
    ])

    return NextResponse.json({
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
      total,
    })
  } catch (error) {
    console.error("[CLIENT_NOTES_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

const createNoteSchema = z.object({
  content: z.string().min(1).max(5000),
  noteType: z
    .enum(["general", "injury", "observation", "goal_update", "concern"])
    .optional()
    .default("general"),
  isPinned: z.boolean().optional().default(false),
  tags: z.array(z.string()).optional().default([]),
})

/**
 * POST /api/clients/[clientId]/notes
 * Create a new coach note.
 * Body: { content, noteType?, isPinned?, tags? }
 */
export async function POST(
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
    const json = await req.json()
    const body = createNoteSchema.parse(json)

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

    // ── Resolve or create tags ───────────────────────────────────────────────
    // Generate a deterministic color from the tag name so client and server agree
    const tagColorPalette = [
      "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
      "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4", "#f59e0b",
    ]
    const tagRecords = await Promise.all(
      body.tags.map((tagName) => {
        // Deterministic index from tag name (server-authoritative)
        const colorIdx = tagName.split("").reduce(
          (acc, ch) => (acc * 31 + ch.charCodeAt(0)) & 0xffffffff,
          0
        ) % tagColorPalette.length
        return db.clientTag.upsert({
          where: { name: tagName },
          create: { name: tagName, color: tagColorPalette[colorIdx] },
          update: {},
        })
      })
    )

    // ── Create note ─────────────────────────────────────────────────────────
    const note = await db.clientNote.create({
      data: {
        clientId,
        authorId: user.id,
        content: body.content,
        noteType: body.noteType,
        isPinned: body.isPinned,
        tags: {
          create: tagRecords.map((tag) => ({ tagId: tag.id })),
        },
      },
      include: {
        author: { select: { id: true, name: true, image: true } },
        tags: { include: { tag: true } },
      },
    })

    return NextResponse.json(
      {
        id: note.id,
        content: note.content,
        noteType: note.noteType,
        isPinned: note.isPinned,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        author: note.author,
        tags: note.tags.map((nt) => nt.tag),
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 422 })
    }
    console.error("[CLIENT_NOTES_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
