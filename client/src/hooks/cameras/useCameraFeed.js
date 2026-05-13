import { useState, useEffect, useCallback } from 'react';
import { fetchCamerasBySlug, getCameraStreamUrl } from '../../services/cameras/cameras';

/**
 * Resolves all cameras for a given CUIP slug and manages the active camera index
 * for intersections with multiple feeds (up to 4).
 *
 * @param {string|null} cuipSlug  — e.g. "MLK_Lindsay"
 * @returns {{ cameras, activeIndex, setActiveIndex, activeCamera, streamUrl, loading, error }}
 */
export function useCameraFeed(cuipSlug) {
  const [cameras, setCameras] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!cuipSlug) {
      setCameras([]);
      setActiveIndex(0);
      setError(null);
      return;
    }

    setCameras([]);
    setActiveIndex(0);
    setLoading(true);
    fetchCamerasBySlug(cuipSlug)
      .then(setCameras)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [cuipSlug]);

  const activeCamera = cameras[activeIndex] ?? null;
  const streamUrl = activeCamera ? getCameraStreamUrl(activeCamera.id) : null;

  const prev = useCallback(() => setActiveIndex((i) => Math.max(0, i - 1)), []);
  const next = useCallback(
    () => setActiveIndex((i) => Math.min(cameras.length - 1, i + 1)),
    [cameras.length]
  );

  return { cameras, activeIndex, setActiveIndex, prev, next, activeCamera, streamUrl, loading, error };
}
