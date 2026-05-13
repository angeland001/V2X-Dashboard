import React from "react";
import { useSpatData } from "../../../../hooks/controllers/useSpatData";

const SIGNAL_COLORS = {
  red: "bg-red-500 shadow-[0_0_12px_3px_rgba(239,68,68,0.7)]",
  yellow: "bg-yellow-400 shadow-[0_0_12px_3px_rgba(250,204,21,0.7)]",
  green: "bg-green-500 shadow-[0_0_12px_3px_rgba(34,197,94,0.7)]",
  inactive: "bg-neutral-700 shadow-[0_0_8px_2px_rgba(64,64,64,0.5)]",
};

function getLabelFromSlug(slug) {
  const parts = slug.split("_");
  if (parts.length === 2) {
    return `${parts[0]} & ${parts[1]}`;
  }
  return slug;
}

function getSignalState(spatData) {
  if (!spatData) return "inactive";
  const reds = spatData.phaseStatusGroupReds ?? [];
  const yellows = spatData.phaseStatusGroupYellows ?? [];
  const greens = spatData.phaseStatusGroupGreens ?? [];

  if (greens.length > 0) return "green";
  if (yellows.length > 0) return "yellow";
  if (reds.length > 0) return "red";
  return "inactive";
}

export function SpatSignalMarker({ cuipSlug, selected, onSelect }) {
  const { spatData, receivedAt } = useSpatData(cuipSlug);
  const signal = getSignalState(spatData);
  const ageMs = receivedAt ? Date.now() - new Date(receivedAt).getTime() : null;
  const isStale = ageMs == null || ageMs > 5000;

  return (
    <div
      onClick={() => onSelect(cuipSlug)}
      className={`flex flex-col items-center gap-2 p-2 cursor-pointer transition-all duration-200 ${
        selected ? "scale-125 z-50" : "hover:scale-110"
      }`}
    >
      {/* Colored dot - changes based on signal state */}
      <div
        className={`w-6 h-6 rounded-full transition-all duration-200 ${
          SIGNAL_COLORS[signal]
        } ${isStale ? "opacity-50 animate-pulse" : ""} ${
          selected ? "ring-2 ring-teal-400 ring-offset-2 ring-offset-neutral-900" : ""
        }`}
      />

      {/* Intersection label */}
      <span className="text-[9px] font-semibold text-neutral-200 leading-tight text-center whitespace-nowrap max-w-[70px]">
        {getLabelFromSlug(cuipSlug)}
      </span>
    </div>
  );
}
