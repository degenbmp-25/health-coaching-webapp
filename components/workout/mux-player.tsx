'use client';

import { useEffect, useRef, useState } from 'react';
import { Icons } from '@/components/icons';

interface VideoPlayerProps {
  playbackId: string;
  title?: string;
  className?: string;
}

export function VideoPlayer({ playbackId, title, className }: VideoPlayerProps) {
  const [hasPlaybackError, setHasPlaybackError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!playbackId || playbackId.trim() === '' || !videoRef.current) return;

    let hlsInstance: any = null;
    const video = videoRef.current;
    const streamUrl = `https://stream.mux.com/${playbackId}.m3u8`;

    setHasPlaybackError(false);

    const handleError = () => setHasPlaybackError(true);
    const handleCanPlay = () => setHasPlaybackError(false);

    video.addEventListener('error', handleError);
    video.addEventListener('canplay', handleCanPlay);

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
    } else {
      import('hls.js')
        .then(({ default: Hls }) => {
          if (!Hls.isSupported()) {
            setHasPlaybackError(true);
            return;
          }

          hlsInstance = new Hls();
          hlsInstance.loadSource(streamUrl);
          hlsInstance.attachMedia(video);
          hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => setHasPlaybackError(false));
          hlsInstance.on(Hls.Events.ERROR, (_event: unknown, data: { fatal?: boolean }) => {
            if (data.fatal) {
              setHasPlaybackError(true);
            }
          });
        })
        .catch(() => setHasPlaybackError(true));
    }

    return () => {
      video.removeEventListener('error', handleError);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeAttribute('src');
      video.load();

      if (hlsInstance) {
        hlsInstance.destroy();
      }
    };
  }, [playbackId]);

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
    <div className="space-y-2">
      <div className="rounded-md overflow-hidden border relative bg-black" style={{ aspectRatio: '16/9' }}>
        <video
          ref={videoRef}
          controls
          playsInline
          preload="metadata"
          poster={`https://image.mux.com/${playbackId}/thumbnail.jpg`}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          className={className}
        >
          {title || 'Workout video'}
        </video>
      </div>
      {hasPlaybackError && (
        <a
          href={`https://stream.mux.com/${playbackId}.m3u8`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs text-primary hover:underline"
        >
          <Icons.externalLink className="h-3 w-3" />
          Open demo video
        </a>
      )}
    </div>
  );
}
