import React from "react";
import { Badge } from "../../../ui/shadcn/badge";
import { useSpatData } from "../../../../hooks/controllers/useSpatData";

const PHASES = [1, 2, 3, 4, 5, 6, 7, 8];

// ── Signal state derivation ───────────────────────────────────────────────────

function getPhaseInfo(n, spatData) {
  if (!spatData) return { signal: "inactive", countdown: null, ped: null };

  const reds    = spatData.phaseStatusGroupReds    ?? [];
  const yellows = spatData.phaseStatusGroupYellows ?? [];
  const greens  = spatData.phaseStatusGroupGreens  ?? [];
  const walks      = spatData.phaseStatusGroupWalks      ?? [];
  const pedClears  = spatData.phaseStatusGroupPedClears  ?? [];
  const dontWalks  = spatData.phaseStatusGroupDontWalks  ?? [];

  let signal = "inactive";
  if (greens.includes(n))  signal = "green";
  else if (yellows.includes(n)) signal = "yellow";
  else if (reds.includes(n))    signal = "red";

  const countdown = spatData[`spatVehMinTimeToChange${n}`] || null;

  let ped = null;
  if (walks.includes(n))     ped = "walk";
  else if (pedClears.includes(n))  ped = "clear";
  else if (dontWalks.includes(n))  ped = "dontWalk";

  return { signal, countdown, ped };
}

// ── Sub-components ────────────────────────────────────────────────────────────

const BULB_COLORS = {
  red:    { on: "bg-red-500 shadow-[0_0_8px_2px_rgba(239,68,68,0.6)]",    off: "bg-neutral-800" },
  yellow: { on: "bg-yellow-400 shadow-[0_0_8px_2px_rgba(250,204,21,0.6)]", off: "bg-neutral-800" },
  green:  { on: "bg-green-500 shadow-[0_0_8px_2px_rgba(34,197,94,0.6)]",  off: "bg-neutral-800" },
};

function Bulb({ color, active }) {
  const cls = active ? BULB_COLORS[color].on : BULB_COLORS[color].off;
  return <div className={`h-3.5 w-3.5 rounded-full transition-colors duration-300 ${cls}`} />;
}

const PED_LABEL = { walk: "WALK", clear: "CLR", dontWalk: "DNW" };
const PED_COLOR = { walk: "text-green-400", clear: "text-yellow-400", dontWalk: "text-red-400" };

function PhaseCard({ n, spatData }) {
  const { signal, countdown, ped } = getPhaseInfo(n, spatData);
  const inactive = signal === "inactive";

  return (
    <div
      className={`flex flex-col items-center gap-1.5 rounded-xl py-2.5 px-1 transition-opacity duration-300 ${
        inactive ? "opacity-30 bg-neutral-900/50" : "bg-neutral-900/90"
      }`}
    >
      <span className="text-[10px] font-bold text-neutral-400">P{n}</span>

      {/* Signal head */}
      <div className="flex flex-col items-center gap-[5px] px-1.5 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800/40">
        <Bulb color="red"    active={signal === "red"} />
        <Bulb color="yellow" active={signal === "yellow"} />
        <Bulb color="green"  active={signal === "green"} />
      </div>

      {/* Countdown */}
      <span className="text-[9px] font-mono font-bold leading-none text-neutral-500 min-h-[10px]">
        {countdown != null ? `${countdown}s` : ""}
      </span>

      {/* Ped indicator */}
      <span className={`text-[7px] font-bold leading-none min-h-[9px] ${ped ? PED_COLOR[ped] : ""}`}>
        {ped ? PED_LABEL[ped] : ""}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PhaseStatePanel({ cuipSlug }) {
  const { spatData, receivedAt, error } = useSpatData(cuipSlug);

  // ── No slug assigned ──────────────────────────────────────────────────────
  if (!cuipSlug) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
            Signal Phases
          </span>
          <Badge variant="outline" className="text-xs text-neutral-500 border-neutral-700">
            No stream
          </Badge>
        </div>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 px-3 py-3 text-xs text-neutral-500 leading-relaxed">
          Assign a <span className="font-mono text-neutral-400">cuip_slug</span> to this
          controller's intersection to enable live SPaT signal phase data.
          <br />
          <span className="text-neutral-600 mt-1 block">
            Example: <span className="font-mono">PUT /api/intersections/{"{id}"}</span> with{" "}
            <span className="font-mono">{`{ "cuip_slug": "MLK_Georgia" }`}</span>
          </span>
        </div>
      </div>
    );
  }

  // ── Age indicator ─────────────────────────────────────────────────────────
  const ageMs   = receivedAt ? Date.now() - new Date(receivedAt).getTime() : null;
  const isStale = ageMs == null || ageMs > 5000;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
          Signal Phases
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-neutral-600">{cuipSlug}</span>
          {error ? (
            <Badge variant="outline" className="text-xs text-red-500/70 border-red-800/40">
              Error
            </Badge>
          ) : isStale ? (
            <Badge variant="outline" className="text-xs text-amber-500/70 border-amber-700/40">
              Waiting…
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-green-500/70 border-green-800/40">
              Live
            </Badge>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-3 rounded-lg border border-red-900/30 bg-red-950/10 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* 4×2 phase grid */}
      <div className="grid grid-cols-4 gap-2">
        {PHASES.map((n) => (
          <PhaseCard key={n} n={n} spatData={spatData} />
        ))}
      </div>

      {/* Timestamp */}
      {receivedAt && (
        <p className="mt-2 text-[9px] text-neutral-700 text-right">
          updated {new Date(receivedAt).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
