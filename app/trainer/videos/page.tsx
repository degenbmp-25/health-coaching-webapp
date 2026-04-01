import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { db } from '@/lib/db'
import { Shell } from '@/components/layout/shell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Icons } from '@/components/icons'

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

  // Get organization's videos
  const videos = await db.organizationVideo.findMany({
    where: { organizationId: membership.organizationId },
    orderBy: { createdAt: 'desc' }
  })

  const organization = membership.organization

  return (
    <Shell>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Video Library</h1>
            <p className="text-muted-foreground">
              Manage exercise demonstration videos for {organization.name}
            </p>
          </div>
          <UploadVideoButton orgId={membership.organizationId} />
        </div>

        {videos.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Icons.clock className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No videos yet</h3>
                <p className="text-muted-foreground mb-4">
                  Upload exercise demonstration videos to assign to workouts.
                </p>
                <UploadVideoButton orgId={membership.organizationId} />
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} orgId={membership.organizationId} />
            ))}
          </div>
        )}
      </div>
    </Shell>
  )
}

function UploadVideoButton({ orgId }: { orgId: string }) {
  return (
    <Button disabled>
      <Icons.add className="mr-2 h-4 w-4" />
      Upload Video
    </Button>
  )
}

function VideoCard({ video, orgId }: { video: any; orgId: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{video.title}</CardTitle>
            <CardDescription>
              {video.status === 'ready' ? (
                <span className="text-green-600">Ready</span>
              ) : video.status === 'pending' ? (
                <span className="text-yellow-600">Processing...</span>
              ) : (
                <span className="text-red-600">Error</span>
              )}
            </CardDescription>
          </div>
          <VideoThumbnail video={video} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {video.duration ? `${Math.floor(video.duration / 60)}:${String(video.duration % 60).padStart(2, '0')}` : '--:--'}
          </div>
          <Button variant="ghost" size="sm">
            <Icons.trash className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function VideoThumbnail({ video }: { video: any }) {
  if (video.status !== 'ready') {
    return (
      <div className="h-16 w-24 bg-muted rounded flex items-center justify-center">
        <Icons.clock className="h-6 w-6 text-muted-foreground/50" />
      </div>
    )
  }

  if (video.thumbnailUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={video.thumbnailUrl}
        alt={video.title}
        className="h-16 w-24 object-cover rounded"
      />
    )
  }

  // If no thumbnail but ready, show play icon
  return (
    <div className="h-16 w-24 bg-muted rounded flex items-center justify-center">
      <Icons.play className="h-6 w-6 text-muted-foreground/50" />
    </div>
  )
}
