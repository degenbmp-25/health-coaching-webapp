'use client';

import { useState } from 'react';
import MuxPlayer from '@mux/mux-player-react';
import { Icons } from '@/components/icons';

interface MuxPlayerProps {
  playbackId: string;
  title?: string;
  className?: string;
}

export function VideoPlayer({ playbackId, title, className }: MuxPlayerProps) {
  const [hasError, setHasError] = useState(false);

  // Guard against empty string playbackId
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

  // Show error fallback UI
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
    <div className="rounded-md overflow-hidden border relative" style={{ aspectRatio: '16/9' }}>
      <MuxPlayer
        playbackId={playbackId}
        metadata={{
          video_title: title || 'Workout Video',
        }}
        streamType="on-demand"
        accentColor="#f97316"
        primaryColor="#ffffff"
        secondaryColor="#1e293b"
        style={{ width: '100%', height: '100%', borderRadius: '6px' }}
        className={className}
        onError={() => setHasError(true)}
      />
    </div>
  );
}
