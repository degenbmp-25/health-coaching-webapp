import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import DailyReminderEmail from '@/emails/daily-reminder'

export const dynamic = 'force-dynamic'

const motivationalQuotes = [
  "The only bad workout is the one that didn't happen.",
  "Your only limit is you.",
  "Success starts with self-discipline.",
  "Every accomplishment starts with the decision to try.",
  "A goal without a plan is just a wish.",
  "Progress, not perfection.",
  "The pain you feel today will be the strength you feel tomorrow.",
  "Don't stop when you're tired. Stop when you're done.",
]

export async function GET(request: Request) {
  try {
    // Verify cron secret if CRON_SECRET is configured
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    } else {
      // CRON_SECRET not configured - reject all requests to require proper external auth
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current hour in UTC
    const currentHour = new Date().getUTCHours()
    const currentHourString = currentHour.toString().padStart(2, '0') + ':00'

    // Find users who should receive notifications at this hour
    const users = await db.user.findMany({
      where: {
        emailNotificationsEnabled: true,
        // For MVP, we'll check for users with notification time matching current UTC hour
        notificationTime: currentHourString,
      },
      include: {
        goals: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        activities: {
          include: {
            activityLogs: {
              orderBy: {
                date: 'desc',
              },
              take: 30, // Last 30 days for streak calculation
            },
          },
        },
      },
    })

    let successCount = 0
    let failureCount = 0
    const emailPromises = []

    for (const user of users) {
      if (!user.email) continue

      // Calculate longest streak
      let currentStreak = 0
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      // Check if user has logged any activity today
      const hasActivityToday = user.activities.some(activity => 
        activity.activityLogs.some(log => {
          const logDate = new Date(log.date)
          logDate.setHours(0, 0, 0, 0)
          return logDate.getTime() === today.getTime()
        })
      )

      if (hasActivityToday) {
        currentStreak = 1
        // Count backwards for consecutive days
        for (let i = 1; i < 30; i++) {
          const checkDate = new Date(today)
          checkDate.setDate(checkDate.getDate() - i)
          
          const hasActivity = user.activities.some(activity => 
            activity.activityLogs.some(log => {
              const logDate = new Date(log.date)
              logDate.setHours(0, 0, 0, 0)
              return logDate.getTime() === checkDate.getTime()
            })
          )
          
          if (hasActivity) {
            currentStreak++
          } else {
            break
          }
        }
      }

      const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]

      const emailPromise = sendEmail({
        to: user.email,
        subject: `Good morning! Here are your goals for today 🎯`,
        react: DailyReminderEmail({
          userName: user.name || undefined,
          goals: user.goals.map(goal => ({
            id: goal.id,
            title: goal.title,
            description: goal.description || undefined,
            targetDate: goal.targetDate?.toISOString() || undefined,
            isCompleted: goal.isCompleted,
          })),
          streakCount: currentStreak,
          motivationalQuote: randomQuote,
        }),
      }).then(async (result) => {
        if (result.success) {
          successCount++
          // Log the sent email
          await db.emailNotification.create({
            data: {
              userId: user.id,
              type: 'daily_reminder',
              subject: `Good morning! Here are your goals for today 🎯`,
              content: `Daily reminder sent with ${user.goals.length} goals and ${currentStreak} day streak`,
              status: 'sent',
              metadata: {
                goalCount: user.goals.length,
                streakCount: currentStreak,
                quote: randomQuote,
              },
            },
          })
        } else {
          failureCount++
          console.error(`Failed to send email to ${user.email}:`, result.error)
        }
      })

      emailPromises.push(emailPromise)
    }

    await Promise.all(emailPromises)

    return NextResponse.json({
      success: true,
      message: `Daily reminders sent: ${successCount} successful, ${failureCount} failed`,
      stats: {
        totalUsers: users.length,
        successCount,
        failureCount,
      },
    })
  } catch (error) {
    console.error('Daily reminder cron error:', error)
    return NextResponse.json(
      { error: 'Failed to send daily reminders' },
      { status: 500 }
    )
  }
}
