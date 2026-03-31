'use client';

import { useState, useRef, useEffect } from 'react';
import { Icons } from '@/components/icons';

interface VideoPlayerProps {
  playbackId: string;
  title?: string;
  className?: string;
}

export function VideoPlayer({ playbackId, title, className }: VideoPlayerProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Stream URL
  const streamUrl = playbackId && playbackId.trim() !== ''
    ? `https://stream.mux.com/${playbackId}.m3u8`
    : null;

  useEffect(() => {
    if (!streamUrl || !videoRef.current) return;

    let hlsInstance: any = null;
    const video = videoRef.current;

    const initVideo = async () => {
      setIsLoading(true);
      setHasError(false);

      // For Safari and modern browsers that support HLS natively
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        video.addEventListener('loadedmetadata', () => setIsLoading(false));
        video.addEventListener('error', () => setHasError(true));
        return;
      }

      // For other browsers, use hls.js
      try {
        const Hls = (await import('hls.js')).default;
        if (Hls.isSupported()) {
          hlsInstance = new Hls({
            qualityWarningMiddleware: false,
          });
          hlsInstance.loadSource(streamUrl);
          hlsInstance.attachMedia(video);
          hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
            setIsLoading(false);
          });
          hlsInstance.on(Hls.Events.ERROR, (event: any, data: any) => {
            if (data.fatal) {
              setHasError(true);
              setIsLoading(false);
            }
          });
        } else {
          setHasError(true);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error loading HLS:', err);
        setHasError(true);
        setIsLoading(false);
      }
    };

    initVideo();

    return () => {
      if (hlsInstance) {
        hlsInstance.destroy();
      }
    };
  }, [streamUrl]);

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
    <div className="rounded-md overflow-hidden border relative" style={{ aspectRatio: '16/9' }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
          <Icons.spinner className="h-8 w-8 animate-spin" />
        </div>
      )}
      <video
        ref={videoRef}
        controls
        playsInline
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        className={className}
      />
    </div>
  );
}
