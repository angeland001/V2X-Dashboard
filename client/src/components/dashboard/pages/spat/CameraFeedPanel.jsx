import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCameraFeed } from '../../../../hooks/cameras/useCameraFeed';

/**
 * Displays live MJPEG camera feed(s) for the selected intersection.
 * Supports up to 4 cameras per intersection with prev/next navigation.
 *
 * @param {string} cuipSlug  — e.g. "MLK_Lindsay"
 */
export function CameraFeedPanel({ cuipSlug }) {
  const { cameras, activeIndex, setActiveIndex, prev, next, activeCamera, streamUrl, loading, error } =
    useCameraFeed(cuipSlug);
  const [imgError, setImgError] = useState(false);
  const imgRef = useRef(null);

  // Abort the MJPEG request immediately when the component unmounts
  useEffect(() => {
    return () => {
      if (imgRef.current) imgRef.current.src = '';
    };
  }, []);

  const handleImgError = useCallback(() => setImgError(true), []);

  const handleRetry = useCallback(() => {
    setImgError(false);
    if (imgRef.current && streamUrl) {
      const base = streamUrl.split('&_t=')[0];
      imgRef.current.src = `${base}&_t=${Date.now()}`;
    }
  }, [streamUrl]);

  // Reset img error when camera changes
  const handleCameraSwitch = useCallback(
    (idx) => {
      setImgError(false);
      setActiveIndex(idx);
    },
    [setActiveIndex]
  );

  if (loading) {
    return (
      <div className="h-[260px] flex-shrink-0 border-b border-neutral-800 bg-neutral-900 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-neutral-600 border-t-teal-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!activeCamera) {
    return (
      <div className="h-[260px] flex-shrink-0 border-b border-neutral-800 bg-neutral-900 flex items-center justify-center">
        <div className="text-center text-muted-foreground text-sm">
          <p>No camera configured</p>
          <p className="text-xs mt-1 text-neutral-600">{cuipSlug}</p>
        </div>
      </div>
    );
  }

  if (imgError || error) {
    return (
      <div className="h-[260px] flex-shrink-0 border-b border-neutral-800 bg-neutral-900 flex flex-col items-center justify-center gap-2">
        <p className="text-sm text-muted-foreground">Stream unavailable</p>
        <button
          onClick={handleRetry}
          className="text-xs px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const hasMultiple = cameras.length > 1;

  return (
    <div className="flex-shrink-0 border-b border-neutral-800 bg-neutral-950">
      {/* Feed */}
      <div className="relative overflow-hidden" style={{ height: 260 }}>
        <img
          ref={imgRef}
          src={streamUrl}
          alt={`Live feed — ${activeCamera.label}`}
          className="w-full h-full object-cover"
          onError={handleImgError}
        />

        {/* Live badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] font-medium text-white/80">LIVE</span>
        </div>

        {/* Camera label + counter */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm">
          <span className="text-[10px] text-white/70 font-mono">{activeCamera.label}</span>
          {hasMultiple && (
            <span className="text-[10px] text-white/40 font-mono">
              {activeIndex + 1}/{cameras.length}
            </span>
          )}
        </div>

        {/* Prev/Next arrows (overlay) */}
        {hasMultiple && (
          <>
            <button
              onClick={() => { setImgError(false); prev(); }}
              disabled={activeIndex === 0}
              className="absolute left-1 top-1/2 -translate-y-1/2 p-1 rounded bg-black/50 hover:bg-black/75 text-white/80 disabled:opacity-20 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setImgError(false); next(); }}
              disabled={activeIndex === cameras.length - 1}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded bg-black/50 hover:bg-black/75 text-white/80 disabled:opacity-20 transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Dot indicators for multi-camera */}
      {hasMultiple && (
        <div className="flex items-center justify-center gap-1.5 py-1.5 bg-neutral-900">
          {cameras.map((cam, i) => (
            <button
              key={cam.id}
              onClick={() => handleCameraSwitch(i)}
              title={cam.label}
              className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${
                i === activeIndex
                  ? 'bg-teal-400 scale-125'
                  : 'bg-neutral-600 hover:bg-neutral-400'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
