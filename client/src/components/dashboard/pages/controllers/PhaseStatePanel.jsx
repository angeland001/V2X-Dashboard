import React from "react";
import { Badge } from "../../../ui/shadcn/badge";
import { useSpatData } from "../../../../hooks/controllers/useSpatData";

const PHASES = [1, 2, 3, 4, 5, 6, 7, 8];

// ── Signal state derivation ───────────────────────────────────────────────────

function getPhaseInfo(n, spatData) {
  if (!spatData) return { signal: "inactive", countdown: null, ped: null, protectedArrow: false };

  const reds    = spatData.phaseStatusGroupReds    ?? [];
  const yellows = spatData.phaseStatusGroupYellows ?? [];
  const greens  = spatData.phaseStatusGroupGreens  ?? [];
  const walks      = spatData.phaseStatusGroupWalks      ?? [];
  const pedClears  = spatData.phaseStatusGroupPedClears  ?? [];
  const dontWalks  = spatData.phaseStatusGroupDontWalks  ?? [];
  const overlapReds = spatData.overlapStatusGroupReds ?? [];
  const overlapYellows = spatData.overlapStatusGroupYellows ?? [];
  const overlapGreens = spatData.overlapStatusGroupGreens ?? [];

  let signal = "inactive";
  if (greens.includes(n))  signal = "green";
  else if (yellows.includes(n)) signal = "yellow";
  else if (reds.includes(n))    signal = "red";

  let protectedArrow = "inactive";
  if (overlapGreens.includes(n)) protectedArrow = "green";
  else if (overlapYellows.includes(n)) protectedArrow = "yellow";
  else if (overlapReds.includes(n)) protectedArrow = "red";

  const countdown = spatData[`spatVehMinTimeToChange${n}`] || null;

  let ped = null;
  if (walks.includes(n))     ped = "walk";
  else if (pedClears.includes(n))  ped = "clear";
  else if (dontWalks.includes(n))  ped = "dontWalk";

  return { signal, countdown, ped, protectedArrow };
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
  const { signal, countdown, ped, protectedArrow } = getPhaseInfo(n, spatData);
  const inactive = signal === "inactive" && protectedArrow === "inactive";

  return (
    <div
      className={`flex flex-col items-center gap-1.5 rounded-xl py-2.5 px-1 transition-opacity duration-300 ${
        inactive ? "opacity-30 bg-neutral-900/50" : "bg-neutral-900/90"
      }`}
    >
      <div className="flex items-center justify-center h-5 w-5 rounded bg-neutral-800 border border-neutral-700">
        <span className="text-[10px] font-bold text-neutral-400">P{n}</span>
      </div>

      {/* Signal heads */}
      <div className="flex gap-1">
        {/* Vehicle signal */}
        <div className="flex flex-col items-center gap-[5px] px-1.5 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800/40">
          <Bulb color="red"    active={signal === "red"} />
          <Bulb color="yellow" active={signal === "yellow"} />
          <Bulb color="green"  active={signal === "green"} />
        </div>

        {/* Protected arrow signal (if applicable) */}
        {protectedArrow !== "inactive" && (
          <div className="flex flex-col items-center gap-[5px] px-1.5 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800/40">
            <Bulb color="red"    active={protectedArrow === "red"} />
            <Bulb color="yellow" active={protectedArrow === "yellow"} />
            <Bulb color="green"  active={protectedArrow === "green"} />
            <span className="text-[6px] font-bold text-neutral-400">↙</span>
          </div>
        )}
      </div>

      {/* Countdown */}
      <span className="text-[9px] font-mono font-bold leading-none text-neutral-500 min-h-[10px]">
        {countdown != null ? `${(countdown / 10).toFixed(1)}s` : ""}
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
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 px-3 py-3 text-xs text-neutral-500">
          Select a CUIP stream above to enable live SPaT signal phase data.
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
