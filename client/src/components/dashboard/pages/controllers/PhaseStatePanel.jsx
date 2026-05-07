import React from "react";
import { Badge } from "../../../ui/shadcn/badge";

const PHASES = [1, 2, 3, 4, 5, 6, 7, 8];

function dominantState(d) {
  if (!d) return null;
  if (d.walk)                return "walk";
  if (d.pedClear)            return "pedClear";
  if (d.minGreen || d.green) return "green";
  if (d.yellow)              return "yellow";
  if (d.redClear)            return "redClear";
  if (d.red)                 return "red";
  return "off";
}

function activeBulb(state) {
  if (!state || state === "off") return null;
  if (state === "yellow")        return "yellow";
  if (state === "red" || state === "redClear") return "red";
  return "green";
}

function Bulb({ color, on, pulse = false, size = "sm" }) {
  const sz = size === "lg" ? "h-5 w-5" : "h-3 w-3";

  let cls = "";
  if (color === "red")    cls = on ? "bg-red-500 ring-1 ring-red-400/60"    : "bg-red-950/70";
  if (color === "yellow") cls = on ? "bg-yellow-400 ring-1 ring-yellow-300/60" : "bg-yellow-950/70";
  if (color === "green")  cls = on ? "bg-green-400 ring-1 ring-green-300/60"  : "bg-green-950/70";

  return (
    <div className={`${sz} rounded-full transition-all duration-300 ${cls}${on && pulse ? " animate-pulse" : ""}`} />
  );
}

function SignalHead({ phaseData, size = "sm" }) {
  const state  = dominantState(phaseData);
  const active = activeBulb(state);
  const gap    = size === "lg" ? "gap-2"   : "gap-[4px]";
  const pad    = size === "lg" ? "px-2.5 py-3" : "px-1.5 py-1.5";
  return (
    <div className={`flex flex-col items-center ${gap} ${pad} rounded-lg bg-neutral-800 border border-neutral-700/50 flex-shrink-0`}>
      <Bulb color="red"    on={active === "red"}    size={size} />
      <Bulb color="yellow" on={active === "yellow"} size={size} />
      <Bulb color="green"  on={active === "green"}  size={size} pulse={state === "pedClear"} />
    </div>
  );
}

const STATE_STYLE = {
  walk:     { label: "WALK",    text: "text-blue-300",    badge: "text-blue-300 bg-blue-900/20 border-blue-800/40" },
  pedClear: { label: "PED CLR", text: "text-orange-300",  badge: "text-orange-300 bg-orange-900/20 border-orange-800/40" },
  green:    { label: "GREEN",   text: "text-green-400",   badge: "text-green-400 bg-green-900/20 border-green-800/40" },
  yellow:   { label: "YELLOW",  text: "text-yellow-400",  badge: "text-yellow-400 bg-yellow-900/20 border-yellow-800/40" },
  redClear: { label: "ALL RED", text: "text-red-400",     badge: "text-red-400 bg-red-900/20 border-red-800/40" },
  red:      { label: "RED",     text: "text-neutral-500", badge: "text-neutral-500 bg-neutral-800 border-neutral-700/40" },
  off:      { label: "OFF",     text: "text-neutral-600", badge: "text-neutral-600 bg-neutral-900 border-neutral-800" },
};

const FLAG_CHIPS = [
  { key: "walk",     label: "Walk",    cls: "text-blue-300 bg-blue-900/20 border-blue-800/30" },
  { key: "pedClear", label: "Ped Clr", cls: "text-orange-300 bg-orange-900/20 border-orange-800/30" },
  { key: "minGreen", label: "Min Grn", cls: "text-green-300 bg-green-900/20 border-green-800/30" },
  { key: "green",    label: "Green",   cls: "text-green-400 bg-green-900/20 border-green-800/30" },
  { key: "yellow",   label: "Yellow",  cls: "text-yellow-300 bg-yellow-900/20 border-yellow-800/30" },
  { key: "redClear", label: "All Red", cls: "text-red-300 bg-red-900/20 border-red-800/30" },
  { key: "red",      label: "Red",     cls: "text-red-400 bg-red-900/20 border-red-800/30" },
  { key: "next",     label: "Next ▶",  cls: "text-sky-300 bg-sky-900/20 border-sky-800/30" },
];

export function PhaseStatePanel({ phaseData, allPhaseData = {}, selectedGroup, onGroupChange, loading }) {
  const hasLiveData = Object.keys(allPhaseData).length > 0;
  const selState = dominantState(phaseData);
  const selStyle = selState ? (STATE_STYLE[selState] ?? STATE_STYLE.off) : null;

  // Detect when polling finished but all phases returned null (static SNMP agent)
  const pollingDone = !loading;
  const noSnmpSupport = pollingDone && !hasLiveData;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
          Signal Phases
        </span>
        {loading && !hasLiveData ? (
          <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-400/40 animate-pulse">
            Polling…
          </Badge>
        ) : hasLiveData ? (
          <Badge variant="outline" className="text-xs text-green-400 border-green-400/40">
            ● LIVE
          </Badge>
        ) : noSnmpSupport ? (
          <Badge variant="outline" className="text-xs text-neutral-500 border-neutral-700">
            No live data
          </Badge>
        ) : null}
      </div>

      {/* Static-agent notice */}
      {noSnmpSupport && (
        <div className="mb-3 rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2.5 text-xs text-neutral-500 leading-relaxed">
          This controller's SNMP agent does not report live phase status.
          The physical signal is active but phase states cannot be read remotely.
        </div>
      )}

      {/* 4×2 phase grid */}
      <div className="grid grid-cols-4 gap-2">
        {PHASES.map((n) => {
          const data      = allPhaseData[n] ?? null;
          const state     = dominantState(data);
          const style     = state ? (STATE_STYLE[state] ?? STATE_STYLE.off) : null;
          const isSelected = selectedGroup === n;

          return (
            <button
              key={n}
              onClick={() => onGroupChange(n)}
              className={[
                "flex flex-col items-center gap-1.5 rounded-xl py-2.5 px-1 transition-all duration-200 focus:outline-none",
                !data ? (noSnmpSupport ? "opacity-15 cursor-default" : "opacity-30 cursor-default") : "",
                isSelected
                  ? "bg-neutral-800 ring-2 ring-white/20 ring-offset-1 ring-offset-neutral-950"
                  : "bg-neutral-900/80 hover:bg-neutral-800/60",
              ].join(" ")}
            >
              <div className="flex items-center gap-0.5">
                <span className="text-[10px] font-bold text-neutral-400">P{n}</span>
                {data?.next && (
                  <span className="text-[8px] text-sky-400 font-bold leading-none">▶</span>
                )}
              </div>

              {data ? (
                <SignalHead phaseData={data} size="sm" />
              ) : (
                <div className="flex flex-col items-center gap-[4px] px-1.5 py-1.5 rounded-lg bg-neutral-800/30 border border-neutral-800/20">
                  <div className="h-3 w-3 rounded-full bg-neutral-800/50" />
                  <div className="h-3 w-3 rounded-full bg-neutral-800/50" />
                  <div className="h-3 w-3 rounded-full bg-neutral-800/50" />
                </div>
              )}

              <span className={`text-[8px] font-bold leading-none ${style?.text ?? "text-neutral-700"}`}>
                {data ? (style?.label ?? "OFF") : "N/A"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected phase detail */}
      {phaseData && selStyle && (
        <div className="mt-3 rounded-xl bg-neutral-900 border border-neutral-800 p-3">
          <div className="flex items-start gap-3">
            <SignalHead phaseData={phaseData} size="lg" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-neutral-500 uppercase tracking-wide mb-1.5">
                Phase {selectedGroup}
              </p>
              <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded border ${selStyle.badge}`}>
                {selStyle.label}
              </span>
              <div className="mt-2 flex flex-wrap gap-1">
                {FLAG_CHIPS.filter(({ key }) => phaseData[key]).map(({ key, label, cls }) => (
                  <span key={key} className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${cls}`}>
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
