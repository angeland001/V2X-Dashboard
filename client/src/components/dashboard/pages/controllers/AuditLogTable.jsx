import React, { useState, useEffect } from "react";
import { Skeleton } from "../../../ui/shadcn/skeleton";
import { fetchAuditLog } from "../../../../services/controllers";

const ACTION_STYLE = {
  CREATE: "bg-green-800 text-green-200",
  UPDATE: "bg-blue-800 text-blue-200",
  DELETE: "bg-red-800 text-red-200",
};

function relativeTime(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function diffSummary(oldValues, newValues) {
  if (!oldValues && newValues) return "Created";
  if (oldValues && !newValues) return "Deleted";
  if (!oldValues || !newValues) return "";
  const changed = Object.keys(newValues).filter(
    (k) => JSON.stringify(oldValues[k]) !== JSON.stringify(newValues[k])
      && k !== "updated_at"
  );
  if (changed.length === 0) return "No field changes";
  return changed.slice(0, 3).join(", ") + (changed.length > 3 ? ", …" : "");
}

export function AuditLogTable({ adapterId }) {
  const [log,     setLog]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adapterId) return;
    fetchAuditLog(adapterId, { limit: 8 })
      .then(setLog)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [adapterId]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-full rounded" />
        ))}
      </div>
    );
  }

  if (log.length === 0) {
    return <p className="text-sm text-neutral-500 text-center py-4">No audit entries.</p>;
  }

  return (
    <div className="rounded-md border border-neutral-800 overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-neutral-800/60">
            <th className="text-left px-3 py-1.5 text-neutral-400 font-medium">Time</th>
            <th className="text-left px-3 py-1.5 text-neutral-400 font-medium">Action</th>
            <th className="text-left px-3 py-1.5 text-neutral-400 font-medium">By</th>
            <th className="text-left px-3 py-1.5 text-neutral-400 font-medium">Changes</th>
          </tr>
        </thead>
        <tbody>
          {log.map((entry, idx) => (
            <tr key={entry.id} className={idx % 2 === 0 ? "bg-neutral-900" : "bg-neutral-900/50"}>
              <td className="px-3 py-1.5 text-neutral-400 whitespace-nowrap">
                {relativeTime(entry.changed_at)}
              </td>
              <td className="px-3 py-1.5">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${ACTION_STYLE[entry.action] ?? "bg-neutral-700 text-neutral-300"}`}>
                  {entry.action}
                </span>
              </td>
              <td className="px-3 py-1.5 text-neutral-300 truncate max-w-[80px]">
                {entry.changed_by_name || entry.changed_by_username || entry.triggered_by || "system"}
              </td>
              <td className="px-3 py-1.5 text-neutral-400 truncate max-w-[140px]">
                {diffSummary(entry.old_values, entry.new_values)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
