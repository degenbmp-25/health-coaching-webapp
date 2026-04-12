'use client';

import MuxPlayer from '@mux/mux-player-react';
import { Icons } from '@/components/icons';

interface VideoPlayerProps {
  playbackId: string;
  title?: string;
  className?: string;
}

export function VideoPlayer({ playbackId, title, className }: VideoPlayerProps) {
  // Guard against empty playbackId
  if (!playbackId || playbackId.trim() === '') {
    return (
      <div className="rounded-md border bg-muted/50 p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icons.clock className="h-4 w-4" />
          <span>No video available</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md overflow-hidden border relative bg-black" style={{ aspectRatio: '16/9' }}>
      <MuxPlayer
        playbackId={playbackId}
        metadata={{
          video_id: playbackId,
          video_title: title || 'Workout video',
        }}
        onError={(event) => {
          console.error('Mux player error:', {
            playbackId,
            title,
            detail: event.detail,
          });
        }}
        streamType="on-demand"
        style={{ width: '100%', height: '100%', display: 'block' }}
        className={className}
      />
    </div>
  );
}
