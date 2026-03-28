import { z } from "zod"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"

const connectSheetSchema = z.object({
  organizationId: z.string().min(1),
  sheetUrl: z.string().url(),
})

// Extract sheet ID from Google Sheets URL
function extractSheetId(url: string): string | null {
  // Patterns for Google Sheets URLs
  const patterns = [
    /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
    /\/d\/([a-zA-Z0-9-_]+)/,
    /^([a-zA-Z0-9-_]{44,})$/, // Raw ID
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return match[1]
    }
  }

  return null
}

// POST /api/sheets/connect - Connect a Google Sheet to an organization
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new Response("Unauthorized", { status: 403 })
    }

    const json = await req.json()
    const body = connectSheetSchema.parse(json)

    // Check if user is a member of the organization
    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: body.organizationId,
          userId: user.id,
        },
      },
    })

    if (!membership || !["owner", "trainer"].includes(membership.role)) {
      return new Response("Forbidden", { status: 403 })
    }

    // Extract sheet ID from URL
    const sheetId = extractSheetId(body.sheetUrl)
    if (!sheetId) {
      return NextResponse.json(
        { error: "Invalid Google Sheets URL" },
        { status: 400 }
      )
    }

    // Upsert the sheet connection (one per trainer per org)
    const connection = await db.sheetConnection.upsert({
      where: {
        organizationId_trainerId: {
          organizationId: body.organizationId,
          trainerId: user.id,
        },
      },
      update: {
        sheetUrl: body.sheetUrl,
        sheetId: sheetId,
      },
      create: {
        organizationId: body.organizationId,
        trainerId: user.id,
        sheetUrl: body.sheetUrl,
        sheetId: sheetId,
      },
    })

    return NextResponse.json(connection, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(error.issues, { status: 422 })
    }
    console.error("Error connecting sheet:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}

// GET /api/sheets/connect - Get user's sheet connections
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new Response("Unauthorized", { status: 403 })
    }

    const connections = await db.sheetConnection.findMany({
      where: { trainerId: user.id },
      include: {
        organization: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(connections)
  } catch (error) {
    console.error("Error fetching sheet connections:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}
