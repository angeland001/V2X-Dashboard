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

function SignalGridCard({ cuipSlug, selected, onSelect }) {
  const { receivedAt } = useSpatData(cuipSlug);
  const ageMs = receivedAt ? Date.now() - new Date(receivedAt).getTime() : null;
  const isActive = ageMs != null && ageMs <= 5000;

  return (
    <button
      onClick={() => onSelect(cuipSlug)}
      className={`flex flex-col justify-between gap-2 p-3 rounded-lg border transition-all duration-200 ${
        selected
          ? "border-teal-500 bg-teal-900/20"
          : "border-neutral-700 bg-neutral-900/50 hover:bg-neutral-800/70 hover:border-neutral-600"
      }`}
    >
      <span className="text-xs font-semibold text-neutral-200 text-left">
        {getLabelFromSlug(cuipSlug)}
      </span>

      <div className="flex items-center gap-1.5">
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
            isActive ? "bg-green-500" : "bg-neutral-600"
          }`}
        />
        <span
          className={`text-[10px] font-semibold ${
            isActive ? "text-green-400" : "text-neutral-500"
          }`}
        >
          {isActive ? "Active" : "Waiting"}
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
