import React from "react";
import { Skeleton } from "../../../ui/shadcn/skeleton";

const ROWS = [
  { key: "minGreen_s",     label: "Min Green" },
  { key: "maxGreen_s",     label: "Max Green" },
  { key: "walk_s",         label: "Walk" },
  { key: "pedClear_s",     label: "Ped Clear" },
  { key: "yellowChange_s", label: "Yellow Change" },
  { key: "redClearance_s", label: "Red Clearance" },
];

export function TimingParametersTable({ timingData, loading }) {
  return (
    <div>
      <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-2">
        Timing Parameters
      </p>
      <div className="rounded-md border border-neutral-800 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-neutral-800/60">
              <th className="text-left px-3 py-1.5 text-neutral-400 font-medium">Parameter</th>
              <th className="text-right px-3 py-1.5 text-neutral-400 font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(({ key, label }, idx) => (
              <tr key={key} className={idx % 2 === 0 ? "bg-neutral-900" : "bg-neutral-900/50"}>
                <td className="px-3 py-1.5 text-neutral-300">{label}</td>
                <td className="px-3 py-1.5 text-right font-mono text-neutral-200">
                  {loading ? (
                    <Skeleton className="h-3 w-12 ml-auto" />
                  ) : timingData?.[key] != null ? (
                    `${timingData[key].toFixed(1)} s`
                  ) : (
                    <span className="text-neutral-600">N/A</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
