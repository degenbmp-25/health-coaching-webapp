'use client';

import MuxPlayer from '@mux/mux-player-react';
import { Icons } from '@/components/icons';

interface MuxPlayerProps {
  playbackId: string;
  title?: string;
  className?: string;
}

export function VideoPlayer({ playbackId, title, className }: MuxPlayerProps) {
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
        primaryColor="#f97316" // Orange to match the app theme
        secondaryColor="#1e293b" // Dark slate
      />
    </div>
  );
}
