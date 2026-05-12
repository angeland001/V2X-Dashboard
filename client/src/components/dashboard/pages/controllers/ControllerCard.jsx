import React from "react";
import { Network, Clock, Cpu } from "lucide-react";
import { Badge } from "../../../ui/shadcn/badge";

const STATUS_DOT = {
  active:      "bg-green-500",
  offline:     "bg-red-500",
  maintenance: "bg-yellow-500",
};

const ADAPTER_TYPE_LABEL = {
  siemens_m60:     "Siemens M60",
  econolite_aries: "Econolite ARIES",
  peek_ada:        "Peek ADA",
  ntcip1202:       "NTCIP 1202",
  generic_snmp:    "Generic SNMP",
};

function relativeTime(iso) {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function ControllerCard({ adapter, isSelected, onSelect }) {
  const statusColor = STATUS_DOT[adapter.connectionStatus] ?? "bg-neutral-500";

  return (
    <div
      onClick={onSelect}
      className={[
        "rounded-lg border p-3 cursor-pointer transition-all duration-150 select-none",
        isSelected
          ? "border-primary bg-neutral-800"
          : "border-neutral-800 bg-neutral-900 hover:bg-neutral-800 hover:border-neutral-700",
      ].join(" ")}
    >
      {/* Row 1: label + status dot */}
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-sm text-neutral-100 leading-tight line-clamp-2">
          {adapter.label || adapter.ipAddress}
        </span>
        <span className={`mt-0.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${statusColor}`} />
      </div>

      {/* Row 2: adapter type badge */}
      <div className="mt-1.5">
        <Badge variant="secondary" className="text-xs px-1.5 py-0">
          <Cpu className="h-3 w-3 mr-1" />
          {ADAPTER_TYPE_LABEL[adapter.adapterType] ?? adapter.adapterType}
        </Badge>
      </div>

      {/* Row 3: IP + last seen */}
      <div className="mt-2 flex items-center justify-between text-xs text-neutral-400">
        <span className="flex items-center gap-1">
          <Network className="h-3 w-3" />
          {adapter.ipAddress}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {relativeTime(adapter.lastSeenAt)}
        </span>
      </div>

      {/* Row 4: intersection name */}
      {adapter.intersectionName && (
        <div className="mt-1 text-xs text-neutral-500 truncate">
          {adapter.intersectionName}
        </div>
      )}
    </div>
  );
}
