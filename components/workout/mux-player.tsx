'use client';

import { Icons } from '@/components/icons';

interface MuxPlayerProps {
  playbackId: string;
  title?: string;
  className?: string;
}

export function VideoPlayer({ playbackId, title, className }: MuxPlayerProps) {
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

  const embedUrl = `https://stream.mux.com/${playbackId}?autoplay=0&muted=0`;

  return (
    <div className="rounded-md overflow-hidden border relative" style={{ aspectRatio: '16/9' }}>
      <iframe
        src={embedUrl}
        title={title || 'Workout Video'}
        allowFullScreen
        allow="autoplay; fullscreen"
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          border: 'none',
        }}
      />
    </div>
  );
}
