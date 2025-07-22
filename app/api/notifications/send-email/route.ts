import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { db } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import CoachMessageEmail from '@/emails/coach-message'
import { z } from 'zod'

const sendEmailSchema = z.object({
  studentId: z.string(),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  actionUrl: z.string().url().optional(),
  actionText: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const authRes = await requireAuth();
    if (authRes instanceof NextResponse) return authRes;
    const currentUser = authRes;

    // Check if user is a coach
    const coach = await db.user.findUnique({
      where: { id: currentUser.id },
    })

    if (coach?.role !== 'coach') {
      return NextResponse.json(
        { error: 'Only coaches can send email notifications' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = sendEmailSchema.parse(body)

    // Check if the student belongs to this coach
    const student = await db.user.findFirst({
      where: {
        id: validatedData.studentId,
        coachId: currentUser.id,
      },
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found or not assigned to you' },
        { status: 404 }
      )
    }

    if (!student.email) {
      return NextResponse.json(
        { error: 'Student does not have an email address' },
        { status: 400 }
      )
    }

    // Send the email
    const result = await sendEmail({
      to: student.email,
      subject: `[Habithletics] ${validatedData.subject}`,
      react: CoachMessageEmail({
        studentName: student.name || undefined,
        coachName: coach.name || 'Your Coach',
        subject: validatedData.subject,
        message: validatedData.message,
        actionUrl: validatedData.actionUrl,
        actionText: validatedData.actionText,
      }),
    })

    if (!result.success) {
      console.error('Failed to send email:', result.error)
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      )
    }

    // Log the sent email
    await db.emailNotification.create({
      data: {
        userId: student.id,
        type: 'coach_message',
        subject: validatedData.subject,
        content: validatedData.message,
        status: 'sent',
        metadata: {
          coachId: currentUser.id,
          coachName: coach.name,
          actionUrl: validatedData.actionUrl,
          actionText: validatedData.actionText,
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Send email error:', error)
    return NextResponse.json(
      { error: 'Failed to send email notification' },
      { status: 500 }
    )
  }
} 