'use client';

import { useState } from 'react';
import MuxPlayer from '@mux/mux-player-react/lazy';
import { Icons } from '@/components/icons';

interface VideoPlayerProps {
  playbackId: string;
  title?: string;
  className?: string;
}

export function VideoPlayer({ playbackId, title, className }: VideoPlayerProps) {
  const [hasError, setHasError] = useState(false);

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

  if (hasError) {
    return (
      <div className="rounded-md border bg-muted/50 p-4">
        <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
          <Icons.clock className="h-8 w-8" />
          <span>Video unavailable</span>
          <span className="text-xs text-muted-foreground/70">Please try again later</span>
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
          console.error('Mux player error:', event);
          setHasError(true);
        }}
        loading="viewport"
        streamType="on-demand"
        style={{ width: '100%', height: '100%', display: 'block' }}
        className={className}
      />
    </div>
  );
}
