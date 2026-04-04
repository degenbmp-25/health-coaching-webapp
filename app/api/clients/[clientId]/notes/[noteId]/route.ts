import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"

const routeContextSchema = z.object({
  params: z.object({
    clientId: z.string(),
    noteId: z.string(),
  }),
})

/**
 * PATCH /api/clients/[clientId]/notes/[noteId]
 * Update a note (author coach only).
 * Body: { content?, noteType?, isPinned?, tags? }
 */
export async function PATCH(
  req: Request,
  context: z.infer<typeof routeContextSchema>
) {
  try {
    const { params } = routeContextSchema.parse(context)
    const user = await requireAuth()

    if (user instanceof NextResponse) {
      return user
    }

    const { clientId, noteId } = params

    const updateSchema = z.object({
      content: z.string().min(1).max(5000).optional(),
      noteType: z
        .enum(["general", "injury", "observation", "goal_update", "concern"])
        .optional(),
      isPinned: z.boolean().optional(),
      tags: z.array(z.string()).optional(),
    })

    const json = await req.json()
    const body = updateSchema.parse(json)

    // ── Fetch existing note ──────────────────────────────────────────────────
    const existing = await db.clientNote.findUnique({
      where: { id: noteId },
      include: { tags: true },
    })

    if (!existing || existing.clientId !== clientId) {
      return new NextResponse("Note not found", { status: 404 })
    }

    // ── Auth: only author can edit ───────────────────────────────────────────
    if (existing.authorId !== user.id) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    // ── Update tags if provided ───────────────────────────────────────────────
    if (body.tags !== undefined) {
      // Remove existing tags and recreate
      await db.clientNoteTag.deleteMany({ where: { noteId } })

      const tagRecords = await Promise.all(
        body.tags.map((tagName) =>
          db.clientTag.upsert({
            where: { name: tagName },
            create: { name: tagName },
            update: {},
          })
        )
      )

      await db.clientNoteTag.createMany({
        data: tagRecords.map((tag) => ({ noteId, tagId: tag.id })),
      })
    }

    // ── Update note fields ───────────────────────────────────────────────────
    const updated = await db.clientNote.update({
      where: { id: noteId },
      data: {
        content: body.content,
        noteType: body.noteType,
        isPinned: body.isPinned,
      },
      include: {
        author: { select: { id: true, name: true, image: true } },
        tags: { include: { tag: true } },
      },
    })

    return NextResponse.json({
      id: updated.id,
      content: updated.content,
      noteType: updated.noteType,
      isPinned: updated.isPinned,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      author: updated.author,
      tags: updated.tags.map((nt) => nt.tag),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 422 })
    }
    console.error("[CLIENT_NOTE_PATCH]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

/**
 * DELETE /api/clients/[clientId]/notes/[noteId]
 * Delete a note (author coach only).
 */
export async function DELETE(
  _req: Request,
  context: z.infer<typeof routeContextSchema>
) {
  try {
    const { params } = routeContextSchema.parse(context)
    const user = await requireAuth()

    if (user instanceof NextResponse) {
      return user
    }

    const { clientId, noteId } = params

    const existing = await db.clientNote.findUnique({
      where: { id: noteId },
    })

    if (!existing || existing.clientId !== clientId) {
      return new NextResponse("Note not found", { status: 404 })
    }

    // ── Auth: only author can delete ─────────────────────────────────────────
    if (existing.authorId !== user.id) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    await db.clientNote.delete({ where: { id: noteId } })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[CLIENT_NOTE_DELETE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
