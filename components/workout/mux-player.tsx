'use client';

import MuxPlayer from '@mux/mux-player-react';
import { Icons } from '@/components/icons';
import { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';

interface MuxPlayerProps {
  playbackId: string;
  title?: string;
  className?: string;
}

export function VideoPlayer({ playbackId, title, className }: MuxPlayerProps) {
  const [useFallback, setUseFallback] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

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

  const streamUrl = `https://stream.mux.com/${playbackId}.m3u8`;

  // If MuxPlayer has error or user prefers fallback, show HTML5 video with HLS.js
  if (useFallback || hasError) {
    return (
      <div className="rounded-md overflow-hidden border relative">
        <video
          ref={videoRef}
          id={`video-${playbackId}`}
          controls
          playsInline
          preload="metadata"
          className={className}
          onError={() => setHasError(true)}
          onLoadedData={() => setIsLoading(false)}
          onCanPlay={() => setIsLoading(false)}
        >
          <source src={streamUrl} type="application/x-mpegURL" />
          <p className="text-sm text-muted-foreground p-2">
            Your browser does not support HLS video playback.
          </p>
        </video>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
            <Icons.clock className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-md overflow-hidden border relative">
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
        onLoadedData={() => setIsLoading(false)}
        onCanPlay={() => setIsLoading(false)}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <Icons.clock className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
