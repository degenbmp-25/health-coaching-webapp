import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { db } from '@/lib/db'
import { Shell } from '@/components/layout/shell'
import { Card, CardContent } from '@/components/ui/card'
import { TrainerVideosClient } from './trainer-videos-client'

export const dynamic = 'force-dynamic'

export default async function TrainerVideosPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/signin')
  }

  // Get user's organization membership
  const membership = await db.organizationMember.findFirst({
    where: {
      userId: user.id,
      role: { in: ['owner', 'trainer', 'coach'] }
    },
    include: {
      organization: true
    }
  })

  if (!membership) {
    // Also check User.role === 'coach' since coaches manage workouts
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { role: true }
    })
    
    if (dbUser?.role !== 'coach') {
      return (
        <Shell>
          <div className="container py-8">
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  You don&apos;t have access to the trainer video library.
                </p>
              </CardContent>
            </Card>
          </div>
        </Shell>
      )
    }
  }

  // Get organization's videos
  const videos = await db.organizationVideo.findMany({
    where: { organizationId: membership?.organizationId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { workoutExercises: true }
      }
    }
  })

  const organization = membership?.organization

  return (
    <Shell>
      <TrainerVideosClient 
        initialVideos={videos} 
        organizationId={membership?.organizationId || null}
        organizationName={organization?.name || 'Your Organization'}
      />
    </Shell>
  )
}
