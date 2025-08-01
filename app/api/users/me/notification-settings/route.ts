import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const updateSettingsSchema = z.object({
  emailNotificationsEnabled: z.boolean(),
  notificationTime: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string(),
})

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { clerkId: userId },
      select: {
        emailNotificationsEnabled: true,
        notificationTime: true,
        timezone: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      settings: user,
    })
  } catch (error) {
    console.error('Get notification settings error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification settings' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateSettingsSchema.parse(body)

    const updatedUser = await db.user.update({
      where: { clerkId: userId },
      data: validatedData,
      select: {
        emailNotificationsEnabled: true,
        notificationTime: true,
        timezone: true,
      },
    })

    return NextResponse.json({
      settings: updatedUser,
      message: 'Notification settings updated successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Update notification settings error:', error)
    return NextResponse.json(
      { error: 'Failed to update notification settings' },
      { status: 500 }
    )
  }
} 