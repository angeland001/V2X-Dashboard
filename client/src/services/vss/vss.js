const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

export async function fetchCameras() {
    const res = await fetch(`${API_URL}/api/vss/cameras`);
    if (!res.ok) throw new Error(`Failed to load cameras (${res.status})`);
    return res.json();
}

export async function fetchLatestEvents(camera, limit = 50) {
    const res = await fetch(`${API_URL}/api/vss/events/latest/${encodeURIComponent(camera)}?limit=${limit}`);
    if (!res.ok) throw new Error(`Failed to load events (${res.status})`);
    return res.json();
}

export async function fetchEventSummary(camera, scope = "today") {
    const res = await fetch(`${API_URL}/api/vss/events/summary/${encodeURIComponent(camera)}?scope=${scope}`);
    if (!res.ok) throw new Error(`Failed to load summary (${res.status})`);
    return res.json();
}

export async function fetchDailyEvents(camera, days = 30) {
    const res = await fetch(`${API_URL}/api/vss/events/daily/${encodeURIComponent(camera)}?days=${days}`);
    if (!res.ok) throw new Error(`Failed to load daily events (${res.status})`);
    return res.json();
}

export async function fetchEventsGeoJSON(camera) {
    const res = await fetch(`${API_URL}/api/vss/events/geojson/${encodeURIComponent(camera)}`);
    if (!res.ok) throw new Error(`Failed to load GeoJSON (${res.status})`);
    return res.json();
}
