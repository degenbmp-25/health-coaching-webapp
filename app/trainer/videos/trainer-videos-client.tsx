'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Icons } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from '@/components/ui/use-toast'

interface OrganizationVideo {
  id: string
  organizationId: string
  muxAssetId: string
  muxPlaybackId: string | null
  title: string
  thumbnailUrl: string | null
  duration: number | null
  status: string
  createdAt: Date
  updatedAt: Date
  _count?: {
    workoutExercises: number
  }
}

interface TrainerVideosClientProps {
  initialVideos: OrganizationVideo[]
  organizationId: string | null
  organizationName: string
}

export function TrainerVideosClient({
  initialVideos,
  organizationId,
  organizationName,
}: TrainerVideosClientProps) {
  const router = useRouter()
  const [videos, setVideos] = React.useState<OrganizationVideo[]>(initialVideos)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)
  const [uploadProgress, setUploadProgress] = React.useState<string>('')
  
  // Upload form state
  const [uploadTitle, setUploadTitle] = React.useState('')
  const [uploadDescription, setUploadDescription] = React.useState('')
  const [uploadFile, setUploadFile] = React.useState<File | null>(null)
  
  // Rename dialog state
  const [renameDialogOpen, setRenameDialogOpen] = React.useState(false)
  const [renameVideoId, setRenameVideoId] = React.useState<string | null>(null)
  const [renameTitle, setRenameTitle] = React.useState('')
  const [isRenaming, setIsRenaming] = React.useState(false)
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [deleteVideoId, setDeleteVideoId] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  function resetUploadForm() {
    setUploadTitle('')
    setUploadDescription('')
    setUploadFile(null)
    setUploadProgress('')
  }

  async function handleUpload() {
    if (!uploadTitle.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter a title for your video before uploading.',
        variant: 'destructive',
      })
      return
    }

    if (!uploadFile) {
      toast({
        title: 'File required',
        description: 'Please select a video file to upload.',
        variant: 'destructive',
      })
      return
    }

    if (!organizationId) {
      toast({
        title: 'Error',
        description: 'No organization found. Please contact support.',
        variant: 'destructive',
      })
      return
    }

    setIsUploading(true)
    setUploadProgress('Creating upload...')

    try {
      // Step 1: Create video record and get Mux upload URL
      const createResponse = await fetch(`/api/organizations/${organizationId}/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: uploadTitle.trim() }),
      })

      if (!createResponse.ok) {
        const error = await createResponse.json()
        throw new Error(error.error || 'Failed to create video record')
      }

      const { video, uploadUrl } = await createResponse.json()
      setUploadProgress('Uploading to Mux...')

      // Step 2: Upload file directly to Mux using the upload URL
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': uploadFile.type || 'video/mp4',
        },
        body: uploadFile,
      })

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text().catch(() => '')
        throw new Error(
          errorText
            ? `Failed to upload video to Mux (${uploadResponse.status}): ${errorText}`
            : `Failed to upload video to Mux (${uploadResponse.status})`
        )
      }

      setUploadProgress('Processing video...')

      // Step 3: Add to local state (webhook will update when ready)
      setVideos(prev => [{
        ...video,
        _count: { workoutExercises: 0 }
      }, ...prev])

      setIsUploadDialogOpen(false)
      resetUploadForm()

      toast({
        title: 'Upload started',
        description: `"${uploadTitle}" is being processed. It will be ready shortly.`,
      })

    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
      setUploadProgress('')
    }
  }

  async function handleRename() {
    if (!renameVideoId || !renameTitle.trim()) return

    setIsRenaming(true)

    try {
      const response = await fetch(`/api/organizations/${organizationId}/videos/${renameVideoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: renameTitle.trim() }),
      })

      if (!response.ok) {
        throw new Error('Failed to rename video')
      }

      setVideos(prev => prev.map(v => 
        v.id === renameVideoId ? { ...v, title: renameTitle.trim() } : v
      ))

      setRenameDialogOpen(false)
      setRenameVideoId(null)
      setRenameTitle('')

      toast({
        title: 'Video renamed',
        description: 'The video title has been updated.',
      })

    } catch (error) {
      toast({
        title: 'Rename failed',
        description: 'Could not rename the video. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsRenaming(false)
    }
  }

  async function handleDelete() {
    if (!deleteVideoId) return

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/organizations/${organizationId}/videos/${deleteVideoId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete video')
      }

      setVideos(prev => prev.filter(v => v.id !== deleteVideoId))

      setDeleteDialogOpen(false)
      setDeleteVideoId(null)

      toast({
        title: 'Video deleted',
        description: 'The video has been removed.',
      })

    } catch (error) {
      toast({
        title: 'Delete failed',
        description: 'Could not delete the video. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  function openRenameDialog(video: OrganizationVideo) {
    setRenameVideoId(video.id)
    setRenameTitle(video.title)
    setRenameDialogOpen(true)
  }

  function openDeleteDialog(video: OrganizationVideo) {
    setDeleteVideoId(video.id)
    setDeleteDialogOpen(true)
  }

  return (
    <div className="mx-auto w-full max-w-7xl min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold">Video Library</h1>
          <p className="text-muted-foreground">
            Manage exercise demonstration videos for {organizationName}
          </p>
        </div>
        
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Icons.add className="mr-2 h-4 w-4" />
              Upload Video
            </Button>
          </DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Upload New Video</DialogTitle>
              <DialogDescription>
                Upload an exercise demonstration video. The title is required before upload.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="video-title">
                  Video Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="video-title"
                  placeholder="e.g., ASLR - Hip Flexor Mobility"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  disabled={isUploading}
                />
                <p className="text-xs text-muted-foreground">
                  Choose a descriptive name so you can find this video later.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="video-description">Description / Notes</Label>
                <Textarea
                  id="video-description"
                  placeholder="Optional notes about this exercise..."
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  disabled={isUploading}
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="video-file">
                  Video File <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="video-file"
                  type="file"
                  accept="video/*,.mov,.mp4"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  disabled={isUploading}
                />
                <p className="text-xs text-muted-foreground">
                  Supported formats: MOV, MP4, HEIC, HEIF
                </p>
              </div>
              
              {isUploading && uploadProgress && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icons.spinner className="h-4 w-4 animate-spin" />
                  {uploadProgress}
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsUploadDialogOpen(false)
                  resetUploadForm()
                }}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={isUploading || !uploadTitle.trim() || !uploadFile}
              >
                {isUploading ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Upload Video'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
              <Button onClick={() => setIsUploadDialogOpen(true)}>
                <Icons.add className="mr-2 h-4 w-4" />
                Upload Your First Video
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onRename={() => openRenameDialog(video)}
              onDelete={() => openDeleteDialog(video)}
            />
          ))}
        </div>
      )}

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Video</DialogTitle>
            <DialogDescription>
              Change the title of this video.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rename-title">New Title</Label>
              <Input
                id="rename-title"
                value={renameTitle}
                onChange={(e) => setRenameTitle(e.target.value)}
                disabled={isRenaming}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)} disabled={isRenaming}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={isRenaming || !renameTitle.trim()}>
              {isRenaming && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the video from Mux and your organization&apos;s library.
              {deleteVideoId && videos.find(v => v.id === deleteVideoId)?._count?.workoutExercises ? (
                <span className="block mt-2 text-destructive">
                  Warning: This video is currently assigned to{' '}
                  {videos.find(v => v.id === deleteVideoId)?._count?.workoutExercises} exercise(s).
                </span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function VideoCard({
  video,
  onRename,
  onDelete,
}: {
  video: OrganizationVideo
  onRename: () => void
  onDelete: () => void
}) {
  const statusColors = {
    pending: 'text-yellow-600',
    ready: 'text-green-600',
    errored: 'text-red-600',
  }

  const statusLabels = {
    pending: 'Processing...',
    ready: 'Ready',
    errored: 'Error',
  }

  return (
    <Card>
      <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{video.title}</CardTitle>
            <CardDescription className={statusColors[video.status as keyof typeof statusColors] || 'text-muted-foreground'}>
              {statusLabels[video.status as keyof typeof statusLabels] || video.status}
            </CardDescription>
          </div>
          <VideoThumbnail video={video} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {video.duration 
              ? `${Math.floor(video.duration / 60)}:${String(video.duration % 60).padStart(2, '0')}`
              : '--:--'}
            {video._count?.workoutExercises ? (
              <span className="ml-2">
                • {video._count.workoutExercises} assignment{video._count.workoutExercises !== 1 ? 's' : ''}
              </span>
            ) : null}
          </div>
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onRename}
              title="Rename"
            >
              <Icons.edit className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onDelete}
              title="Delete"
              className="text-destructive hover:text-destructive"
            >
              <Icons.trash className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function VideoThumbnail({ video }: { video: OrganizationVideo }) {
  if (video.status !== 'ready') {
    return (
      <div className="h-16 w-24 bg-muted rounded flex items-center justify-center flex-shrink-0">
        <Icons.clock className="h-6 w-6 text-muted-foreground/50" />
      </div>
    )
  }

  if (video.muxPlaybackId) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/mux/thumbnail/${encodeURIComponent(video.muxPlaybackId)}`}
        alt={video.title}
        className="h-16 w-24 object-cover rounded flex-shrink-0"
      />
    )
  }

  // If no thumbnail but ready, show play icon
  return (
    <div className="h-16 w-24 bg-muted rounded flex items-center justify-center flex-shrink-0">
      <Icons.play className="h-6 w-6 text-muted-foreground/50" />
    </div>
  )
}
