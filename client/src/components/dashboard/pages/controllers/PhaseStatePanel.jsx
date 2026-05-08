import React from "react";
import { Badge } from "../../../ui/shadcn/badge";

const PHASES = [1, 2, 3, 4, 5, 6, 7, 8];

function Bulb({ size = "sm" }) {
  const sz = size === "lg" ? "h-5 w-5" : "h-3 w-3";
  return <div className={`${sz} rounded-full bg-neutral-800/50`} />;
}

function SignalHeadPlaceholder({ size = "sm" }) {
  const gap = size === "lg" ? "gap-2"        : "gap-[4px]";
  const pad = size === "lg" ? "px-2.5 py-3"  : "px-1.5 py-1.5";
  return (
    <div className={`flex flex-col items-center ${gap} ${pad} rounded-lg bg-neutral-800/30 border border-neutral-800/20 flex-shrink-0`}>
      <Bulb size={size} />
      <Bulb size={size} />
      <Bulb size={size} />
    </div>
  );
}

export function PhaseStatePanel() {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
          Signal Phases
        </span>
        <Badge variant="outline" className="text-xs text-amber-500/70 border-amber-700/40">
          Placeholder
        </Badge>
      </div>

      {/* Explanation notice */}
      <div className="mb-3 rounded-lg border border-amber-900/30 bg-amber-950/10 px-3 py-2.5 text-xs text-neutral-500 leading-relaxed">
        Live phase status is not available. The M60 SNMP agent returns static
        configuration OIDs — real-time signal state requires a serial/NEMA TS2
        integration or alternate hardware interface.
      </div>

      {/* 4×2 static placeholder grid */}
      <div className="grid grid-cols-4 gap-2 opacity-25 pointer-events-none select-none">
        {PHASES.map((n) => (
          <div
            key={n}
            className="flex flex-col items-center gap-1.5 rounded-xl py-2.5 px-1 bg-neutral-900/80"
          >
            <span className="text-[10px] font-bold text-neutral-400">P{n}</span>
            <SignalHeadPlaceholder size="sm" />
            <span className="text-[8px] font-bold leading-none text-neutral-700">—</span>
          </div>
        ))}
      </div>
    </div>
  );
}
