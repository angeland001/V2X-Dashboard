/**
 * VSSEventsMap — NVIDIA VSS Traffic Intelligence Dashboard
 * Direction A: Operations Grid
 * Map (left) · 2×3 Camera Grid (center) · AI Panel (right) · Timeline (bottom)
 *
 * Map: Mapbox GL JS (dark-v11) with custom camera-pin markers.
 * Feeds: real MJPEG streams via /api/cameras/:id/stream proxy.
 * Events: VSS events from /api/vss/events/*.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  Search, Layers, Maximize2, LayoutGrid, List, SlidersHorizontal,
  Zap, Sparkles, Send, Pause, Rewind, FastForward, Camera,
} from "lucide-react";
import { fetchAllCameras, getCameraStreamUrl } from "@/services/cameras/cameras";
import { fetchCameras as fetchVssCameras, fetchLatestEvents } from "@/services/vss/vss";
import { INTERSECTION_COORDS } from "@/components/dashboard/pages/spat/SpatMapView";

const DEFAULT_CENTER = [-85.2895, 35.0450]; // Chattanooga, TN

// ── Design tokens (from design_handoff_vss_dashboard) ────────────────────────
const T = {
  bg:        "#09090b",
  bg2:       "#0c0d10",
  card:      "#101114",
  cardHi:    "#15171b",
  border:    "#1f2127",
  borderHi:  "#2a2d35",
  fg:        "#fafafa",
  muted:     "#a1a1aa",
  dim:       "#71717a",
  faint:     "#52525b",
  accent:    "#34d399",
  accentDim: "#10b981",
  warn:      "#f59e0b",
  danger:    "#f87171",
  info:      "#60a5fa",
  mono:      '"Geist Mono", ui-monospace, "SF Mono", Menlo, monospace',
};

const sevColor = (s) =>
  s === "high" ? T.danger : s === "med" ? T.warn : T.info;

// ── Placeholder suggestions for AI chat (UI-only) ────────────────────────────
const SUGGESTIONS = [
  "Show me all collisions today",
  "Which intersection has the most near-misses?",
  "Summarize the last hour",
];

// ── Global animation CSS ──────────────────────────────────────────────────────
const VSS_CSS = `
  .vss-live-dot { animation: vss-pulse 1.6s linear infinite; }
  @keyframes vss-pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
  @keyframes vss-blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
  .vss-pin-ring {
    position: absolute; top: 50%; left: 50%;
    transform: translate(-50%,-50%);
    border-radius: 50%; pointer-events: none;
    animation: vss-ring-kf 2s linear infinite;
  }
  .vss-pin-ring-2 { animation-delay: .6s; }
  @keyframes vss-ring-kf {
    0%   { width:10px; height:10px; opacity:.8; }
    100% { width:34px; height:34px; opacity:0; }
  }
`;

// ── Shared button styles ──────────────────────────────────────────────────────
const iconBtn = {
  width: 22, height: 22, borderRadius: 4, border: `1px solid ${T.border}`,
  background: T.card, color: T.muted, cursor: "pointer",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  padding: 0, flexShrink: 0,
};
const outlineBtn = {
  display: "inline-flex", alignItems: "center", gap: 4,
  fontSize: 11, height: 24, padding: "0 8px", borderRadius: 6,
  background: "transparent", color: T.fg, border: `1px solid ${T.border}`,
  cursor: "pointer",
};
const ghostBtn = {
  display: "inline-flex", alignItems: "center", gap: 4,
  fontSize: 11, height: 24, padding: "0 8px", borderRadius: 6,
  background: "transparent", color: T.muted, border: "none",
  cursor: "pointer",
};

// ─────────────────────────────────────────────────────────────────────────────
// BADGE
// ─────────────────────────────────────────────────────────────────────────────
function Badge({ tone = "neutral", children, style }) {
  const tones = {
    neutral: { bg: "rgba(161,161,170,.10)", fg: T.muted,   bd: T.border },
    live:    { bg: "rgba(52,211,153,.12)", fg: T.accent, bd: "rgba(52,211,153,.3)" },
    alert:   { bg: "rgba(248,113,113,.12)",fg: T.danger, bd: "rgba(248,113,113,.3)" },
    warn:    { bg: "rgba(245,158,11,.12)", fg: T.warn,   bd: "rgba(245,158,11,.3)" },
    info:    { bg: "rgba(96,165,250,.12)", fg: T.info,   bd: "rgba(96,165,250,.3)" },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 10, fontWeight: 500, padding: "2px 6px", borderRadius: 4,
      background: t.bg, color: t.fg, border: `1px solid ${t.bd}`,
      fontFamily: T.mono, letterSpacing: "0.02em", textTransform: "uppercase",
      ...style,
    }}>{children}</span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TOP BAR
// ─────────────────────────────────────────────────────────────────────────────
function TopBar({ onlineCount, totalCount }) {
  return (
    <div style={{
      height: 52, display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 16px", borderBottom: `1px solid ${T.border}`,
      background: T.bg2, flexShrink: 0,
    }}>
      {/* Left */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          paddingRight: 12, borderRight: `1px solid ${T.border}`, height: 30,
        }}>
          <div style={{
            width: 24, height: 24, borderRadius: 5,
            background: T.fg, color: T.bg,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: T.mono, fontWeight: 700, fontSize: 12,
          }}>V</div>
          <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 600, color: T.fg }}>
            vss<span style={{ color: T.accent }}>.</span>ops
          </span>
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.fg, letterSpacing: "-0.01em" }}>
            Traffic Intelligence
          </div>
          <div style={{ fontSize: 10.5, color: T.dim, fontFamily: T.mono }}>
            NVIDIA VSS · AI Detection
          </div>
        </div>

        <div style={{ marginLeft: 18, display: "flex", gap: 4 }}>
          {["Live", "Replay", "Investigations", "Cameras"].map((t, i) => (
            <button key={t} style={{
              fontSize: 12, padding: "5px 10px", borderRadius: 5,
              background: i === 0 ? T.cardHi : "transparent",
              color: i === 0 ? T.fg : T.muted,
              border: "none", cursor: "pointer", fontFamily: "inherit",
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Right */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          background: T.bg, border: `1px solid ${T.border}`,
          borderRadius: 6, padding: "0 10px", height: 30, width: 280,
        }}>
          <Search size={13} style={{ color: T.dim, flexShrink: 0 }} />
          <input
            placeholder="Search events, cameras, plates…"
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              color: T.fg, fontSize: 12, fontFamily: "inherit",
            }}
          />
        </div>

        <Badge tone="live">
          <span className="vss-live-dot" style={{
            display: "inline-block", width: 5, height: 5, borderRadius: 3, background: T.accent,
          }} />
          {onlineCount}/{totalCount} ONLINE
        </Badge>

        <div style={{
          width: 28, height: 28, borderRadius: 14, background: "#2a1a14",
          border: `1px solid ${T.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, color: "#fcd34d", fontWeight: 600, fontFamily: T.mono,
        }}>AM</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERSECTION MARKER — rendered via React portal into a Mapbox marker element
// ─────────────────────────────────────────────────────────────────────────────
function VSSMapMarker({ slug, selected, onSelect }) {
  const label = slug.replace("_", " & ");
  return (
    <div
      onClick={() => onSelect(slug)}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        padding: 6, cursor: "pointer",
        transform: selected ? "scale(1.25)" : "scale(1)",
        transition: "transform 200ms ease",
        zIndex: selected ? 50 : "auto",
      }}
    >
      {/* Dot */}
      <div style={{
        width: 18, height: 18, borderRadius: "50%",
        background: T.accent,
        boxShadow: selected
          ? `0 0 0 3px ${T.accentDim}, 0 0 14px 4px rgba(52,211,153,.6)`
          : "0 0 10px 2px rgba(52,211,153,.45)",
        outline: selected ? `2px solid ${T.accent}` : "none",
        outlineOffset: 3,
      }} />
      {/* Label */}
      <span style={{
        fontSize: 9, fontWeight: 600, color: "#e4e4e7",
        fontFamily: T.mono, textAlign: "center",
        whiteSpace: "nowrap", maxWidth: 72, lineHeight: 1.3,
        textShadow: "0 1px 3px rgba(0,0,0,.9)",
      }}>{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAPBOX MAP CARD
// Uses INTERSECTION_COORDS from SpatMapView for pin locations (Chattanooga, TN).
// Mirrors the SpatMapView portal pattern so React components render inside markers.
// ─────────────────────────────────────────────────────────────────────────────
function MapCard({ selectedSlug, onSelect, camCount }) {
  const containerRef  = useRef(null);
  const mapRef        = useRef(null);
  const [markerElements, setMarkerElements] = useState({});
  const [mapLoaded,   setMapLoaded]   = useState(false);

  // Boot Mapbox once, centered on Chattanooga
  useEffect(() => {
    mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_API;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: DEFAULT_CENTER,
      zoom: 14,
      pitch: 0,
    });

    map.on("load", () => {
      const elements = {};
      Object.entries(INTERSECTION_COORDS).forEach(([slug, [lng, lat]]) => {
        const el = document.createElement("div");
        new mapboxgl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([lng, lat])
          .addTo(map);
        elements[slug] = el;
      });
      setMarkerElements(elements);
      setMapLoaded(true);
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      setMapLoaded(false);
    };
  }, []);

  // Fly to selected intersection
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !selectedSlug) return;
    const coords = INTERSECTION_COORDS[selectedSlug];
    if (!coords) return;
    mapRef.current.easeTo({ center: coords, zoom: 16, duration: 800 });
  }, [selectedSlug, mapLoaded]);

  const totalPins = Object.keys(INTERSECTION_COORDS).length;

  return (
    <div style={{
      flex: 1, minHeight: 0,
      display: "flex", flexDirection: "column",
      background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px", borderBottom: `1px solid ${T.border}`,
        background: T.cardHi, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Layers size={13} style={{ color: T.muted }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: T.fg }}>Sector Map</span>
          <Badge tone="neutral">{totalPins} INTERSECTIONS</Badge>
          {camCount > 0 && <Badge tone="live">{camCount} CAMS</Badge>}
        </div>
        <button style={iconBtn}><Maximize2 size={11} /></button>
      </div>

      {/* Map + portals */}
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

        {/* Render a React marker component into each Mapbox marker DOM node */}
        {Object.entries(markerElements).map(([slug, el]) =>
          createPortal(
            <VSSMapMarker
              key={slug}
              slug={slug}
              selected={selectedSlug === slug}
              onSelect={onSelect}
            />,
            el
          )
        )}

        {/* Legend */}
        <div style={{
          position: "absolute", left: 10, bottom: 10, zIndex: 10,
          background: "rgba(16,17,20,.85)", backdropFilter: "blur(6px)",
          border: `1px solid ${T.border}`, borderRadius: 6,
          padding: "6px 8px", display: "flex", flexDirection: "column", gap: 4,
          fontSize: 9.5, fontFamily: T.mono, color: T.muted,
        }}>
          {[
            { color: T.accent, label: "LIVE" },
            { color: T.danger, label: "EVENT ACTIVE" },
            { color: T.faint,  label: "OFFLINE" },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: color, flexShrink: 0 }} />
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SELECTED CAMERA SUMMARY CARD
// ─────────────────────────────────────────────────────────────────────────────
function SummaryCard({ camera, events }) {
  if (!camera) {
    return (
      <div style={{
        flexShrink: 0, background: T.card, border: `1px solid ${T.border}`,
        borderRadius: 10, padding: 14,
        fontSize: 12, color: T.dim, textAlign: "center",
      }}>
        Select a camera on the map or grid
      </div>
    );
  }

  const isAlert   = camera.status === "alert";
  const recentEvt = events.slice(0, 2);

  return (
    <div style={{
      flexShrink: 0, background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 10, overflow: "hidden",
    }}>
      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 12, fontFamily: T.mono, color: T.dim, letterSpacing: "0.04em" }}>
              CAM-{String(camera.id).padStart(3, "0")}
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: T.fg, letterSpacing: "-0.01em", marginTop: 2 }}>
              {camera.intersection_name || camera.label}
            </div>
          </div>
          <Badge tone={isAlert ? "alert" : "live"}>{isAlert ? "EVENT" : "LIVE"}</Badge>
        </div>

        {/* Stat mini-cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <StatMini label="Events" value={String(events.length)} unit="today" trend={events.length > 0 ? `+${events.length}` : "0"} />
          <StatMini label="Status" value={camera.status === "active" ? "ON" : "OFF"} />
          <StatMini label="Feed" value={camera.ip_address ? "OK" : "—"} />
        </div>

        {/* Recent events */}
        {recentEvt.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 4 }}>
            <div style={{
              fontSize: 9, color: T.faint, fontFamily: T.mono,
              letterSpacing: "0.06em", textTransform: "uppercase",
            }}>Recent</div>
            {recentEvt.map((e, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: T.muted }}>
                <span style={{
                  width: 5, height: 5, borderRadius: 3, flexShrink: 0,
                  background: sevColor(e.severity || "low"),
                }} />
                <span style={{ fontFamily: T.mono, color: T.dim, fontSize: 10, flexShrink: 0 }}>
                  {e.timestamp
                    ? new Date(e.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
                    : "—"}
                </span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {e.event_type || "Event"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatMini({ label, value, unit, trend }) {
  const isPos = trend && trend.startsWith("+") && trend !== "+0";
  return (
    <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 8px" }}>
      <div style={{ fontSize: 9, color: T.faint, fontFamily: T.mono, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginTop: 2 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: T.fg, fontFamily: T.mono }}>{value}</span>
        {unit && <span style={{ fontSize: 9, color: T.dim }}>{unit}</span>}
      </div>
      {trend && (
        <div style={{ fontSize: 9, color: isPos ? T.accent : T.dim, fontFamily: T.mono }}>{trend}</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CAMERA GRID TOOLBAR
// ─────────────────────────────────────────────────────────────────────────────
function GridToolbar({ alertCount }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 2px", flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{
          fontSize: 11, color: T.dim, fontFamily: T.mono,
          letterSpacing: "0.04em", textTransform: "uppercase",
        }}>Camera Feeds</span>
        <span style={{ fontSize: 10, color: T.faint }}>·</span>
        <button style={outlineBtn}><LayoutGrid size={11} /> 2 × 3</button>
        <button style={ghostBtn}><List size={11} /> List</button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {alertCount > 0 && (
          <Badge tone="warn">
            <span style={{ width: 5, height: 5, borderRadius: 3, background: T.warn }} />
            {alertCount} ALERT{alertCount > 1 ? "S" : ""}
          </Badge>
        )}
        <button style={outlineBtn}><SlidersHorizontal size={11} /> Filter</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CAMERA TILE
// ─────────────────────────────────────────────────────────────────────────────
function CameraTile({ camera, selected, hasAlert, onClick }) {
  const imgRef    = useRef(null);
  const retryRef  = useRef(null);
  const aliveRef  = useRef(true);

  // Abort the MJPEG stream on unmount so the browser closes the connection.
  // We set a flag to prevent the retry timer from firing after unmount.
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      clearTimeout(retryRef.current);
      if (imgRef.current) imgRef.current.src = "";
    };
  }, []);

  // When the camera changes, reload the img src immediately.
  useEffect(() => {
    if (!imgRef.current || !camera) return;
    const url = getCameraStreamUrl(camera.id);
    if (url) imgRef.current.src = url;
  }, [camera?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // On any stream error, schedule a reconnect after 3 s instead of permanently
  // hiding the feed. MJPEG streams occasionally hiccup and recover.
  const handleError = useCallback(() => {
    clearTimeout(retryRef.current);
    retryRef.current = setTimeout(() => {
      if (!aliveRef.current || !imgRef.current || !camera) return;
      const url = getCameraStreamUrl(camera.id);
      if (url) imgRef.current.src = url;
    }, 3000);
  }, [camera]); // eslint-disable-line react-hooks/exhaustive-deps

  const streamUrl = camera ? getCameraStreamUrl(camera.id) : null;

  if (!camera) {
    return (
      <div style={{
        background: T.cardHi, border: `1px solid ${T.border}`,
        borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
        opacity: 0.3,
      }}>
        <Camera size={20} style={{ color: T.faint }} />
      </div>
    );
  }

  const borderColor = selected ? T.accent : hasAlert ? "#3a1f1f" : T.border;
  const shadow      = selected
    ? `0 0 0 1px ${T.accent}, 0 8px 28px rgba(52,211,153,.08)`
    : "none";

  return (
    <button onClick={onClick} style={{
      position: "relative", width: "100%", height: "100%",
      background: T.card, border: `1px solid ${borderColor}`,
      borderRadius: 8, overflow: "hidden", padding: 0, cursor: "pointer",
      display: "flex", flexDirection: "column", textAlign: "left",
      boxShadow: shadow, transition: "border-color .15s, box-shadow .15s",
    }}>
      {/* Feed — always mounted when there's a URL; error triggers auto-retry */}
      <div style={{ flex: 1, minHeight: 0, position: "relative", background: "#000" }}>
        {streamUrl ? (
          <img
            ref={imgRef}
            src={streamUrl}
            alt={camera.label}
            onError={handleError}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <PlaceholderFeed />
        )}

        {/* HUD top-left */}
        <div style={{
          position: "absolute", top: 6, left: 6,
          display: "flex", alignItems: "center", gap: 4,
        }}>
          <span className="vss-live-dot" style={{
            display: "inline-block", width: 5, height: 5, borderRadius: 3, background: T.danger,
          }} />
          <span style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 600, color: T.fg }}>LIVE</span>
          <span style={{ fontFamily: T.mono, fontSize: 9, color: "rgba(250,250,250,.5)", marginLeft: 2 }}>
            CAM-{String(camera.id).padStart(3, "0")}
          </span>
        </div>

        {/* Alert badge */}
        {hasAlert && (
          <div style={{
            position: "absolute", top: 6, right: 6,
            background: "rgba(248,113,113,.18)", border: `1px solid ${T.danger}`,
            borderRadius: 4, padding: "2px 6px",
            fontSize: 9, fontFamily: T.mono, color: T.danger, letterSpacing: "0.04em",
          }}>EVENT · ALERT</div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: "7px 10px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderTop: `1px solid ${T.border}`, background: T.cardHi, flexShrink: 0,
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
          <span style={{
            fontSize: 12, fontWeight: 500, color: T.fg,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {camera.intersection_name || camera.label}
          </span>
          <span style={{ fontSize: 10, color: T.dim, fontFamily: T.mono }}>
            CAM-{String(camera.id).padStart(3, "0")}
          </span>
        </div>
        <span className="vss-live-dot" style={{
          display: "inline-block", width: 6, height: 6, borderRadius: 3,
          background: hasAlert ? T.danger : T.accent, flexShrink: 0,
        }} />
      </div>
    </button>
  );
}

// Black placeholder shown when no live stream is configured
function PlaceholderFeed() {
  return (
    <div style={{
      width: "100%", height: "100%",
      background: "#000",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <span style={{
        fontFamily: T.mono, fontSize: 11, fontWeight: 500,
        color: T.faint, letterSpacing: "0.08em",
      }}>TBA</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AI / EVENT PANEL
// ─────────────────────────────────────────────────────────────────────────────
function EventPanel({ events }) {
  const [format, setFormat] = useState("cards");
  const [filter, setFilter] = useState("all");
  const [chatText, setChatText] = useState("");

  const filtered = filter === "all"
    ? events
    : events.filter((e) => (e.event_type || "").toLowerCase().includes(filter));

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%",
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 10, overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px", borderBottom: `1px solid ${T.border}`,
        background: T.cardHi, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 5,
            background: "linear-gradient(135deg,#34d399,#10b981)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Sparkles size={11} style={{ color: "#053024" }} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.fg }}>VSS Assistant</div>
            <div style={{ fontSize: 10, color: T.dim, fontFamily: T.mono }}>
              {format === "chat" ? "Ask about any event" : format === "cards" ? "Live event feed" : "Streaming transcript"}
            </div>
          </div>
        </div>
        {/* Format switcher */}
        <div style={{ display: "flex", gap: 3 }}>
          {["cards", "chat", "log"].map((f) => (
            <button key={f} onClick={() => setFormat(f)} style={{
              fontSize: 9, padding: "2px 6px", borderRadius: 4,
              background: format === f ? T.border : "transparent",
              color: format === f ? T.fg : T.faint,
              border: `1px solid ${format === f ? T.borderHi : "transparent"}`,
              cursor: "pointer", fontFamily: T.mono, textTransform: "uppercase",
            }}>{f}</button>
          ))}
        </div>
      </div>

      {/* Filter chips (cards / log) */}
      {format !== "chat" && (
        <div style={{
          display: "flex", gap: 5, padding: "7px 12px",
          borderBottom: `1px solid ${T.border}`, background: T.bg2,
          overflowX: "auto", flexShrink: 0,
        }}>
          {["all", "near-miss", "congestion", "emergency", "weather"].map((k) => (
            <button key={k} onClick={() => setFilter(k)} style={{
              fontSize: 10, padding: "3px 8px", borderRadius: 999,
              background: filter === k ? T.fg : "transparent",
              color: filter === k ? T.bg : T.muted,
              border: `1px solid ${filter === k ? T.fg : T.border}`,
              cursor: "pointer", whiteSpace: "nowrap",
              fontFamily: T.mono, textTransform: "uppercase", letterSpacing: "0.04em",
            }}>{k}</button>
          ))}
        </div>
      )}

      {/* Body */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {format === "chat"  && <ChatBody chatText={chatText} />}
        {format === "cards" && <CardsBody events={filtered} />}
        {format === "log"   && <LogBody events={filtered} />}
      </div>

      {/* Suggestions row (chat) */}
      {format === "chat" && (
        <div style={{
          padding: "8px 14px 0",
          display: "flex", gap: 6, flexWrap: "wrap",
          borderTop: `1px solid ${T.border}`, flexShrink: 0,
        }}>
          {SUGGESTIONS.map((s, i) => (
            <button key={i} style={{
              fontSize: 11, padding: "4px 8px", borderRadius: 6,
              background: T.bg2, color: T.muted,
              border: `1px solid ${T.border}`, cursor: "pointer", fontFamily: "inherit",
            }}>{s}</button>
          ))}
        </div>
      )}

      {/* Composer (chat) */}
      {format === "chat" && (
        <div style={{ padding: 14, display: "flex", gap: 6, flexShrink: 0 }}>
          <div style={{
            flex: 1, display: "flex", alignItems: "center", gap: 6,
            background: T.bg2, border: `1px solid ${T.border}`,
            borderRadius: 6, padding: "0 10px", height: 36,
          }}>
            <Sparkles size={13} style={{ color: T.dim, flexShrink: 0 }} />
            <input
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder="Ask the AI about any event…"
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                color: T.fg, fontSize: 12, fontFamily: "inherit",
              }}
            />
          </div>
          <button style={{
            width: 36, height: 36, borderRadius: 6, border: "none",
            background: T.accent, color: "#053024", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Send size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function ChatBody() {
  return (
    <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
        <div style={{
          maxWidth: "90%", background: T.cardHi, border: `1px solid ${T.border}`,
          borderRadius: 8, padding: "8px 11px", fontSize: 12.5, lineHeight: 1.5, color: T.fg,
        }}>
          What was detected in the last hour?
        </div>
        <span style={{ fontSize: 9, color: T.faint, fontFamily: T.mono }}>14:33:12</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
        <div style={{
          maxWidth: "90%",
          background: "rgba(52,211,153,.06)",
          border: "1px solid rgba(52,211,153,.18)",
          borderRadius: 8, padding: "8px 11px", fontSize: 12.5, lineHeight: 1.5, color: T.fg,
        }}>
          Connect your NVIDIA VSS endpoint to surface real-time event summaries, detection counts, and incident details here.
        </div>
        <span style={{ fontSize: 9, color: T.faint, fontFamily: T.mono }}>14:33:13</span>
      </div>
      {/* Live cursor */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", fontSize: 11 }}>
        <span style={{ color: T.accent, fontFamily: T.mono }}>VSS</span>
        <span style={{
          display: "inline-block", width: 6, height: 12,
          background: T.muted, animation: "vss-blink 1s infinite",
        }} />
      </div>
    </div>
  );
}

function CardsBody({ events }) {
  if (events.length === 0) {
    return (
      <div style={{ padding: "40px 14px", textAlign: "center", color: T.dim, fontSize: 12 }}>
        No events to display
      </div>
    );
  }
  return (
    <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
      {events.map((e, i) => {
        const sev   = e.severity || "low";
        const type  = e.event_type || "Event";
        const time  = e.timestamp
          ? new Date(e.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
          : "—";
        const camId = e.camera_id
          ? `CAM-${String(e.camera_id).padStart(3, "0")}`
          : "—";
        return (
          <div key={e.id ?? i} style={{
            background: T.cardHi, border: `1px solid ${T.border}`,
            borderLeft: `3px solid ${sevColor(sev)}`,
            borderRadius: 6, padding: "10px 12px",
            display: "flex", flexDirection: "column", gap: 5, cursor: "pointer",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Badge
                tone={sev === "high" ? "alert" : sev === "med" ? "warn" : "info"}
              >{type}</Badge>
              <span style={{ fontSize: 10, color: T.dim, fontFamily: T.mono }}>{time}</span>
            </div>
            {e.description && (
              <div style={{ fontSize: 12, color: T.fg, lineHeight: 1.45 }}>{e.description}</div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10, color: T.muted, fontFamily: T.mono }}>{camId}</span>
              {e.confidence != null && (
                <>
                  <span style={{ fontSize: 10, color: T.faint }}>·</span>
                  <span style={{ fontSize: 10, color: T.muted }}>
                    {(e.confidence * 100).toFixed(0)}% conf.
                  </span>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LogBody({ events }) {
  return (
    <div style={{ padding: "10px 14px", fontSize: 11, lineHeight: 1.8, color: T.muted, fontFamily: T.mono }}>
      {events.map((e, i) => {
        const sev   = e.severity || "low";
        const type  = (e.event_type || "event").toUpperCase();
        const camId = e.camera_id
          ? `CAM-${String(e.camera_id).padStart(3, "0")}`
          : "———";
        const time  = e.timestamp
          ? new Date(e.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
          : "——:——:——";
        return (
          <div key={e.id ?? i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 2 }}>
            <span style={{ color: T.faint, flexShrink: 0 }}>{time}</span>
            <span style={{ color: sevColor(sev), flexShrink: 0, width: 10 }}>{sev === "high" ? "!" : "·"}</span>
            <span style={{ color: T.dim, flexShrink: 0, width: 68, overflow: "hidden" }}>{camId}</span>
            <span style={{ color: T.fg, fontWeight: 500, flexShrink: 0 }}>{type}</span>
            <span style={{ color: T.muted }}>{e.description || ""}</span>
          </div>
        );
      })}
      {/* Live cursor */}
      <div style={{ display: "flex", gap: 8 }}>
        <span style={{ color: T.faint }}>{new Date().toLocaleTimeString("en-US", { hour12: false })}</span>
        <span style={{ color: T.accent }}>·</span>
        <span style={{
          display: "inline-block", width: 6, height: 12,
          background: T.accent, animation: "vss-blink 1s infinite",
        }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMELINE RIBBON
// ─────────────────────────────────────────────────────────────────────────────
function TimelineRibbon({ events }) {
  const markers = events.slice(0, 10).map((e, i) => ({
    x: 0.04 + (i / Math.max(events.length, 1)) * 0.88,
    sev: e.severity || "low",
  }));

  return (
    <div style={{
      height: 84, display: "flex", flexDirection: "column",
      background: T.bg2, borderTop: `1px solid ${T.border}`,
      padding: "8px 16px", flexShrink: 0,
    }}>
      {/* Header row */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 6,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Zap size={12} style={{ color: T.accent }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: T.fg, letterSpacing: "-0.01em" }}>
            Event Timeline
          </span>
          <span style={{ fontSize: 10, color: T.dim, fontFamily: T.mono }}>
            last 60 min · {events.length} events
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button style={iconBtn}><Rewind size={11} /></button>
          <button style={{ ...iconBtn, color: T.accent }}><Pause size={11} /></button>
          <button style={iconBtn}><FastForward size={11} /></button>
          <span style={{ fontSize: 10, fontFamily: T.mono, color: T.muted, marginLeft: 6 }}>
            {new Date().toLocaleTimeString("en-US", { hour12: false })} · LIVE
          </span>
        </div>
      </div>

      {/* Track */}
      <div style={{
        position: "relative", flex: 1,
        background: T.bg, borderRadius: 4, border: `1px solid ${T.border}`,
      }}>
        {/* Tick marks */}
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} style={{
            position: "absolute", left: `${(i / 6) * 100}%`, top: 0, bottom: 0,
            width: 1, background: T.border, opacity: 0.5,
          }}>
            <span style={{
              position: "absolute", bottom: -14, left: -10,
              fontSize: 8, color: T.faint, fontFamily: T.mono,
            }}>{60 - Math.round((i / 6) * 60)}m</span>
          </div>
        ))}
        {/* Area density fill */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.4 }}>
          <path
            d="M0 80 L10 65 L20 55 L30 60 L40 45 L50 30 L60 40 L70 50 L80 25 L90 60 L100 70 L100 100 L0 100 Z"
            fill={T.accent} opacity="0.25"
          />
          <path
            d="M0 80 L10 65 L20 55 L30 60 L40 45 L50 30 L60 40 L70 50 L80 25 L90 60 L100 70"
            fill="none" stroke={T.accent} strokeWidth="0.6"
          />
        </svg>
        {/* Event markers */}
        {markers.map((m, i) => (
          <div key={i} style={{
            position: "absolute", left: `${m.x * 100}%`, top: 6, bottom: 6,
            width: 2, background: sevColor(m.sev), borderRadius: 1,
            boxShadow: `0 0 4px ${sevColor(m.sev)}`,
          }} />
        ))}
        {/* Playhead */}
        <div style={{
          position: "absolute", right: "2%", top: -4, bottom: -4, width: 2, background: T.fg,
        }}>
          <div style={{
            position: "absolute", top: -3, left: -3,
            width: 8, height: 8, background: T.fg, transform: "rotate(45deg)",
          }} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function VSSEventsMap() {
  const [cameras,      setCameras]      = useState([]);
  const [vssEvents,    setVssEvents]    = useState([]);
  const [selectedSlug, setSelectedSlug] = useState(null);
  const [selectedCamId, setSelectedCamId] = useState(null);

  // Fetch physical cameras (for the grid)
  useEffect(() => {
    fetchAllCameras()
      .then(setCameras)
      .catch(console.error);
  }, []);

  // Fetch VSS events — auto-select first VSS camera, refresh every 60 s
  useEffect(() => {
    const load = () =>
      fetchVssCameras()
        .then((cams) => cams.length > 0 && fetchLatestEvents(cams[0].id, 100))
        .then((evts) => evts && setVssEvents(evts))
        .catch(console.error);

    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  const selectedCam  = cameras.find((c) => c.id === selectedCamId);
  const camEvents    = vssEvents.filter((e) => String(e.camera_id) === String(selectedCamId));
  const alertCount   = vssEvents.filter((e) => e.severity === "high").length;
  const onlineCount  = cameras.filter((c) => c.status === "active").length;

  // Camera grid: up to 6 tiles.
  // Exclude MLK_Central and MLK_Peeples cameras; prioritize MLK_Market cameras.
  const EXCLUDED_SLUGS = ["MLK_Central", "MLK_Peeples"];
  const marketCams = cameras.filter((c) => c.intersection_slug === "MLK_Market");
  const otherCams  = cameras.filter(
    (c) => !EXCLUDED_SLUGS.includes(c.intersection_slug) && c.intersection_slug !== "MLK_Market"
  );
  const gridTiles = [...marketCams, ...otherCams].slice(0, 6);
  while (gridTiles.length < 6) gridTiles.push(null);

  const handleSlugSelect = useCallback(
    (slug) => setSelectedSlug((prev) => (prev === slug ? null : slug)),
    []
  );
  const handleCamSelect = useCallback(
    (id) => setSelectedCamId((prev) => (prev === id ? null : id)),
    []
  );

  return (
    <>
      <style>{VSS_CSS}</style>
      <div style={{
        display: "flex", flexDirection: "column",
        height: "100vh", overflow: "hidden",
        background: T.bg, color: T.fg,
        fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
      }}>
        <TopBar onlineCount={onlineCount} totalCount={cameras.length} />

        {/* Main 3-column area */}
        <div style={{ flex: 1, minHeight: 0, display: "flex", padding: 12, gap: 12 }}>

          {/* LEFT: Map + summary */}
          <div style={{ width: 360, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            <MapCard
              selectedSlug={selectedSlug}
              onSelect={handleSlugSelect}
              camCount={onlineCount}
            />
            <SummaryCard camera={selectedCam} events={camEvents} />
          </div>

          {/* CENTER: Camera grid */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            <GridToolbar alertCount={alertCount} />
            <div style={{
              flex: 1, minHeight: 0,
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gridTemplateRows: "repeat(2, 1fr)",
              gap: 12,
            }}>
              {gridTiles.map((cam, i) => (
                <CameraTile
                  key={cam?.id ?? `empty-${i}`}
                  camera={cam}
                  selected={cam != null && cam.id === selectedCamId}
                  hasAlert={cam != null && vssEvents.some(
                    (e) => String(e.camera_id) === String(cam.id) && e.severity === "high"
                  )}
                  onClick={() => cam && handleCamSelect(cam.id)}
                />
              ))}
            </div>
          </div>

          {/* RIGHT: AI / Event panel */}
          <div style={{ width: 400, flexShrink: 0 }}>
            <EventPanel events={vssEvents} />
          </div>
        </div>

        <TimelineRibbon events={vssEvents} />
      </div>
    </>
  );
}
