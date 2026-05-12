const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

export async function updateIntersectionCuipSlug(intersectionId, cuipSlug) {
  const res = await fetch(`${API_URL}/api/intersections/${intersectionId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cuip_slug: cuipSlug ?? null }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Failed to update intersection (${res.status})`);
  return data;
}
