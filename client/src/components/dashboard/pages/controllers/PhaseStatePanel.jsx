import React from "react";
import { Badge } from "../../../ui/shadcn/badge";

const PHASES = [1, 2, 3, 4, 5, 6, 7, 8];

function phaseColor(flags, isSelected) {
  if (!flags) return "bg-neutral-700 text-neutral-400";
  if (flags.walk)     return "bg-blue-300 text-blue-900";
  if (flags.pedClear) return "bg-orange-400 text-orange-900 animate-pulse";
  if (flags.green)    return "bg-green-500 text-white";
  if (flags.yellow)   return "bg-yellow-400 text-yellow-900";
  if (flags.red)      return "bg-red-600 text-white";
  return "bg-neutral-700 text-neutral-400";
}

function phaseLabel(flags) {
  if (!flags) return "—";
  if (flags.walk)     return "WALK";
  if (flags.pedClear) return "PED CLR";
  if (flags.green)    return "GREEN";
  if (flags.yellow)   return "YELLOW";
  if (flags.red)      return "RED";
  return "OFF";
}

export function PhaseStatePanel({ phaseData, selectedGroup, onGroupChange, loading }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
          Signal Phases
        </span>
        {loading && (
          <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-400/40 animate-pulse">
            Polling…
          </Badge>
        )}
        {!loading && phaseData && (
          <Badge variant="outline" className="text-xs text-green-400 border-green-400/40">
            ● LIVE
          </Badge>
        )}
      </div>

      {/* 2×4 grid of phase circles */}
      <div className="grid grid-cols-4 gap-2">
        {PHASES.map((n) => {
          const isSelected = selectedGroup === n;
          const flags      = isSelected ? phaseData : null;
          const color      = phaseColor(flags, isSelected);
          return (
            <button
              key={n}
              onClick={() => onGroupChange(n)}
              className={[
                "relative flex flex-col items-center justify-center rounded-lg",
                "w-full aspect-square transition-all duration-200 font-mono",
                color,
                isSelected ? "ring-2 ring-white ring-offset-2 ring-offset-neutral-900 scale-105" : "opacity-60 hover:opacity-90",
              ].join(" ")}
            >
              <span className="text-xs font-bold">{n}</span>
              {isSelected && (
                <span className="text-[9px] leading-none mt-0.5 font-medium">
                  {phaseLabel(flags)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected phase detail */}
      {phaseData && (
        <div className="mt-3 grid grid-cols-4 gap-1 text-center">
          {[
            { key: "walk",     label: "Walk",    color: phaseData.walk    ? "text-blue-300"  : "text-neutral-600" },
            { key: "green",    label: "Green",   color: phaseData.green   ? "text-green-400" : "text-neutral-600" },
            { key: "yellow",   label: "Yellow",  color: phaseData.yellow  ? "text-yellow-400": "text-neutral-600" },
            { key: "red",      label: "Red",     color: phaseData.red     ? "text-red-400"   : "text-neutral-600" },
          ].map(({ key, label, color }) => (
            <div key={key} className="flex flex-col items-center">
              <span className={`text-[10px] font-bold ${color}`}>{label}</span>
              <span className={`text-[9px] ${color}`}>{phaseData[key] ? "ON" : "off"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
