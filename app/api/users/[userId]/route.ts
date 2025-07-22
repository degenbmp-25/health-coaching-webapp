import { NextResponse } from "next/server"
import { z } from "zod"

import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"
import { userNameSchema } from "@/lib/validations/user"

const routeContextSchema = z.object({
  params: z.object({
    userId: z.string(),
  }),
})

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

    // If user is getting their own details
    if (params.userId === user.id) {
      const userDetails = await db.user.findUnique({
        where: {
          id: params.userId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
        },
      })

      if (!userDetails) {
        return new NextResponse("User not found", { status: 404 })
      }

      return NextResponse.json(userDetails)
    }
    
    // If a coach is getting their student's details
    if (user.role === "coach") {
      // Check if the requested user is one of their students
      const student = await db.user.findFirst({
        where: {
          id: params.userId,
          coachId: user.id,
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      })

      if (student) {
        return NextResponse.json(student)
      }
    }
    
    // Default case: fetch limited public info
    const userDetails = await db.user.findUnique({
      where: {
        id: params.userId,
      },
      select: {
        id: true,
        name: true,
        image: true,
      },
    })

    if (!userDetails) {
      return new NextResponse("User not found", { status: 404 })
    }

    return NextResponse.json(userDetails)
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 })
  }
}

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

    if (user.id !== params.userId) {
      return new NextResponse("Unauthorized", { status: 403 })
    }

    const json = await req.json()
    const body = userNameSchema.parse(json)

    const updatedUser = await db.user.update({
      where: {
        id: user.id,
      },
      data: {
        name: body.name,
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 422 })
    }

    return new NextResponse("Internal Error", { status: 500 })
  }
}
