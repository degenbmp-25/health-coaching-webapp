import { requireAuth } from "@/lib/auth-utils"
import * as z from "zod"

import { db } from "@/lib/db"
import { NextResponse } from "next/server"

const conversationCreateSchema = z.object({
  participantId: z.string(),
})

export async function GET() {
  try {
    const session = await requireAuth()

    if (session instanceof NextResponse) return session
    const currentUser = session

    const conversations = await db.conversation.findMany({
      where: {
        participants: {
          some: {
            id: currentUser.id
          }
        }
      },
      include: {
        participants: {
          select: {
            id: true,
            name: true,
            image: true,
          }
        },
        messages: {
          take: 1,
          orderBy: {
            createdAt: 'desc'
          },
          select: {
            content: true,
            createdAt: true,
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    return new Response(JSON.stringify(conversations))
  } catch (error) {
    return new Response(null, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAuth()

    if (session instanceof NextResponse) return session
    const currentUser = session

    const json = await req.json()
    const body = conversationCreateSchema.parse(json)

    // Check if conversation already exists
    const existingConversation = await db.conversation.findFirst({
      where: {
        AND: [
          {
            participants: {
              some: {
                id: currentUser.id
              }
            }
          },
          {
            participants: {
              some: {
                id: body.participantId
              }
            }
          }
        ]
      }
    })

    if (existingConversation) {
      return new Response(JSON.stringify(existingConversation))
    }

    // Create new conversation
    const conversation = await db.conversation.create({
      data: {
        participants: {
          connect: [
            { id: currentUser.id },
            { id: body.participantId }
          ]
        }
      },
      include: {
        participants: {
          select: {
            id: true,
            name: true,
            image: true,
          }
        }
      }
    })

    return new Response(JSON.stringify(conversation))
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.issues), { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
} 