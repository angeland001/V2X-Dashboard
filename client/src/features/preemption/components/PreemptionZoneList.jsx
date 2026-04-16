import React from "react";
import { Badge } from "../../../components/ui/shadcn/badge";
import { Button } from "../../../components/ui/shadcn/button";

export function PreemptionZoneList({
  configs,
  selectedConfigId,
  onSelect,
  onNew,
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-zinc-300">
          Saved zones ({configs.length})
        </div>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 h-7 px-3 text-xs text-zinc-300 border border-zinc-600 bg-zinc-800 hover:bg-zinc-700"
          onClick={onNew}
        >
          + New
        </Button>
      </div>
      <div className="text-[11px] text-zinc-500">
        Selected zone is highlighted in orange on the map
      </div>
      {configs.length ? (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {configs.map((config) => {
            const isSelected =
              String(config.id) === String(selectedConfigId);
            return (
              <button
                key={config.id}
                type="button"
                onClick={() => onSelect(config)}
                className={`w-full rounded border px-3 py-2 text-left transition overflow-hidden ${
                  isSelected
                    ? "border-orange-500/60 bg-orange-500/15"
                    : "border-zinc-700 bg-zinc-800/80 hover:bg-zinc-800"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-medium text-white truncate">
                    {config.name}
                  </div>
                  <Badge
                    className={
                      config.status === "inactive"
                        ? "bg-zinc-700 text-zinc-200 border-zinc-600 text-[10px]"
                        : "bg-orange-500/15 text-orange-200 border-orange-500/30 text-[10px]"
                    }
                  >
                    {config.status || "active"}
                  </Badge>
                </div>
                <div className="text-[11px] text-zinc-400 mt-1">
                  {config.spatZoneName || "SPaT source"} • SG{" "}
                  {config.signalGroup ?? "—"} • Lanes{" "}
                  {Array.isArray(config.laneIds) && config.laneIds.length
                    ? config.laneIds.join(", ")
                    : "—"}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-xs text-zinc-500">
          No named preemption zones saved for this intersection yet.
        </div>
      )}
    </div>
  );
}
