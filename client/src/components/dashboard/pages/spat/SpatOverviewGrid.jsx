import React from "react";
import { useSpatData } from "../../../../hooks/controllers/useSpatData";

const CUIP_SLUGS = [
  "MLK_Broad",
  "MLK_Central",
  "MLK_Chestnut",
  "MLK_Douglas",
  "MLK_Georgia",
  "MLK_Houston",
  "MLK_Lindsay",
  "MLK_Magnolia",
  "MLK_Market",
  "MLK_Peeples",
  "MLK_Pine",
  "Lab_Device",
];

function getLabelFromSlug(slug) {
  const parts = slug.split("_");
  if (parts.length === 2) {
    return `${parts[0]} & ${parts[1]}`;
  }
  return slug;
}

function getSignalState(spatData) {
  if (!spatData) return { state: "inactive", label: "—" };
  const greens = spatData.phaseStatusGroupGreens ?? [];
  const yellows = spatData.phaseStatusGroupYellows ?? [];
  const reds = spatData.phaseStatusGroupReds ?? [];

  if (greens.length > 0) return { state: "green", label: "🟢" };
  if (yellows.length > 0) return { state: "yellow", label: "🟡" };
  if (reds.length > 0) return { state: "red", label: "🔴" };
  return { state: "inactive", label: "⚪" };
}

const SIGNAL_GLOW = {
  red: "shadow-[0_0_8px_2px_rgba(239,68,68,0.5)] bg-red-600",
  yellow: "shadow-[0_0_8px_2px_rgba(250,204,21,0.5)] bg-yellow-500",
  green: "shadow-[0_0_8px_2px_rgba(34,197,94,0.5)] bg-green-600",
  inactive: "bg-neutral-700",
};

function SignalGridCard({ cuipSlug, selected, onSelect }) {
  const { spatData, receivedAt } = useSpatData(cuipSlug);
  const signal = getSignalState(spatData);
  const ageMs = receivedAt ? Date.now() - new Date(receivedAt).getTime() : null;
  const isStale = ageMs == null || ageMs > 5000;

  return (
    <button
      onClick={() => onSelect(cuipSlug)}
      className={`flex flex-col gap-3 p-3 rounded-lg border transition-all duration-200 ${
        selected
          ? "border-teal-500 bg-teal-900/20"
          : "border-neutral-700 bg-neutral-900/50 hover:bg-neutral-800/70 hover:border-neutral-600"
      }`}
    >
      {/* Intersection name */}
      <span className="text-xs font-semibold text-neutral-200">
        {getLabelFromSlug(cuipSlug)}
      </span>

      {/* Signal indicator - large colored dot */}
      <div className="flex items-center gap-2">
        <div
          className={`w-5 h-5 rounded-full transition-all duration-200 flex-shrink-0 ${
            SIGNAL_GLOW[signal.state]
          } ${isStale ? "opacity-40" : ""}`}
        />
        <span className="text-sm font-semibold text-neutral-300">{signal.label}</span>
      </div>

      {/* Live/Stale badge */}
      <div>
        <span
          className={`text-[10px] font-bold rounded px-2 py-1 inline-block ${
            isStale
              ? "bg-amber-900/40 text-amber-400"
              : "bg-green-900/40 text-green-400"
          }`}
        >
          {isStale ? "Waiting" : "Live"}
        </span>
      </div>
    </button>
  );
}

export function SpatOverviewGrid({ selectedSlug, onSelect }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Title */}
      <div className="px-4 py-3 border-b border-neutral-800 flex-shrink-0">
        <span className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
          All Intersections
        </span>
      </div>

      {/* Grid - 2 column layout for the right panel width */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-2 gap-2">
          {CUIP_SLUGS.map((slug) => (
            <SignalGridCard
              key={slug}
              cuipSlug={slug}
              selected={selectedSlug === slug}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
