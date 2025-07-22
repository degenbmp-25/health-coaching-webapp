import { requireAuth } from "@/lib/auth-utils"
import * as z from "zod"
import type { User } from "@prisma/client"
import { NextResponse } from "next/server"

import { db } from "@/lib/db"

const routeContextSchema = z.object({
  params: z.object({
    conversationId: z.string(),
  }),
})

const messageCreateSchema = z.object({
  content: z.string().min(1),
})

type ConversationWithParticipants = {
  id: string
  createdAt: Date
  updatedAt: Date
  participants: User[]
}

type MessageWithSender = {
  id: string
  content: string
  createdAt: Date
  updatedAt: Date
  senderId: string
  receiverId: string
  conversationId: string
  sender: {
    id: string
    name: string | null
    image: string | null
  }
}

export async function GET(
  req: Request,
  context: z.infer<typeof routeContextSchema>
) {
  try {
    const { params } = routeContextSchema.parse(context)
    const authRes = await requireAuth();
    if (authRes instanceof NextResponse) return authRes;
    const currentUser = authRes;

    // Verify user is part of conversation
    const conversation = await (db as any).conversation.findFirst({
      where: {
        id: params.conversationId,
        participants: {
          some: {
            id: currentUser.id
          }
        }
      },
    }) as ConversationWithParticipants | null

    if (!conversation) {
      return new Response("Not found", { status: 404 })
    }

    const messages = await (db as any).message.findMany({
      where: {
        conversationId: params.conversationId,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    }) as MessageWithSender[]

    return new Response(JSON.stringify(messages))
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.issues), { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}

export async function POST(
  req: Request,
  context: z.infer<typeof routeContextSchema>
) {
  try {
    const { params } = routeContextSchema.parse(context)
    const authRes = await requireAuth();
    if (authRes instanceof NextResponse) return authRes;
    const currentUser = authRes;

    // Verify user is part of conversation
    const conversation = await (db as any).conversation.findFirst({
      where: {
        id: params.conversationId,
        participants: {
          some: {
            id: currentUser.id
          }
        }
      },
      include: {
        participants: true
      }
    }) as ConversationWithParticipants | null

    if (!conversation) {
      return new Response("Not found", { status: 404 })
    }

    const json = await req.json()
    const body = messageCreateSchema.parse(json)

    // Get the other participant's ID
    const receiverId = conversation.participants.find(
      (participant) => participant.id !== currentUser.id
    )?.id

    if (!receiverId) {
      return new Response("Receiver not found", { status: 404 })
    }

    // Create message
    const message = await (db as any).message.create({
      data: {
        content: body.content,
        senderId: currentUser.id,
        receiverId: receiverId,
        conversationId: params.conversationId,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          }
        }
      }
    }) as MessageWithSender

    // Update conversation timestamp
    await (db as any).conversation.update({
      where: {
        id: params.conversationId,
      },
      data: {
        updatedAt: new Date(),
      }
    })

    return new Response(JSON.stringify(message))
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.issues), { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
} 