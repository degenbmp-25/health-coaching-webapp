'use client';

import MuxPlayer from '@mux/mux-player-react';
import { Icons } from '@/components/icons';
import { useState } from 'react';

interface MuxPlayerProps {
  playbackId: string;
  title?: string;
  className?: string;
}

export function VideoPlayer({ playbackId, title, className }: MuxPlayerProps) {
  const [useFallback, setUseFallback] = useState(false);
  const [hasError, setHasError] = useState(false);

  if (!playbackId) {
    return (
      <div className="rounded-md border bg-muted/50 p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icons.clock className="h-4 w-4" />
          <span>No video available</span>
        </div>
      </div>
    );
  }

  const streamUrl = `https://stream.mux.com/${playbackId}.m3u8`;

  // If MuxPlayer has error or user prefers fallback, show HTML5 video
  if (useFallback || hasError) {
    return (
      <div className="rounded-md overflow-hidden border">
        <video
          controls
          playsInline
          preload="metadata"
          className={className}
          onError={() => setHasError(true)}
        >
          <source src={streamUrl} type="application/x-mpegURL" />
          <p className="text-sm text-muted-foreground p-2">
            Your browser does not support HLS video playback.
          </p>
        </video>
      </div>
    );
  }

  return (
    <div className="rounded-md overflow-hidden border">
      <MuxPlayer
        playbackId={playbackId}
        metadata={{
          video_title: title,
          viewer_user_id: 'workout-user',
        }}
        streamType="on-demand"
        className={className}
        primaryColor="#f97316"
        secondaryColor="#1e293b"
        onError={() => setHasError(true)}
      />
    </div>
  );
}
