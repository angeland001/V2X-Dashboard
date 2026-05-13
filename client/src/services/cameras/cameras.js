const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function getAuthHeader() {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Fetch all cameras for a CUIP slug.
 * Returns [] if no intersection or cameras match the slug (not an error).
 */
export async function fetchCamerasBySlug(slug) {
  const res = await fetch(`${API_URL}/api/cameras/by-slug/${encodeURIComponent(slug)}`, {
    headers: getAuthHeader(),
  });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`Camera fetch failed (${res.status})`);
  return res.json();
}

/**
 * Fetch all cameras for an intersection ID.
 * Returns [] if no cameras are configured for this intersection (not an error).
 */
export async function fetchCamerasByIntersectionId(intersectionId) {
  const res = await fetch(`${API_URL}/api/cameras/by-intersection/${intersectionId}`, {
    headers: getAuthHeader(),
  });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`Camera fetch failed (${res.status})`);
  return res.json();
}

/**
 * Fetch all cameras
 */
export async function fetchAllCameras() {
  const res = await fetch(`${API_URL}/api/cameras`, {
    headers: getAuthHeader(),
  });

  if (!res.ok) throw new Error(`Cameras fetch failed (${res.status})`);
  return res.json();
}

/**
 * Get proxied stream URL for use in <img src="...">
 * Includes JWT as query param since browsers can't send Authorization headers with <img>
 */
export function getCameraStreamUrl(cameraId) {
  const token = localStorage.getItem('authToken');
  if (!token) return null;
  return `${API_URL}/api/cameras/${cameraId}/stream?token=${encodeURIComponent(token)}`;
}

/**
 * Get snapshot (single JPEG frame) URL for thumbnails/popups
 */
export function getCameraSnapshotUrl(cameraId) {
  const token = localStorage.getItem('authToken');
  if (!token) return null;
  return `${API_URL}/api/cameras/${cameraId}/snapshot?token=${encodeURIComponent(token)}`;
}
