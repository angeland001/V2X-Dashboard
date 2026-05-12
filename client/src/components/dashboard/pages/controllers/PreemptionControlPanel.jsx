import React, { useState, useEffect, useCallback } from "react";
import { Zap, X, RefreshCw } from "lucide-react";
import { Button } from "../../../ui/shadcn/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../../ui/shadcn/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../ui/shadcn/select";
import { fetchPreemptionZoneConfigs } from "../../../../services/preemptionZoneConfigs";
import {
  triggerPreemption,
  clearPreemption,
  fetchPreemptionCommandLog,
  fetchPreemptionStatus,
} from "../../../../services/controllers";

const POLL_INTERVAL_MS = 5000;

const STATUS_BADGE = {
  INACTIVE:               { label: "Inactive",       className: "bg-neutral-700 text-neutral-300" },
  PREEMPTING:             { label: "PREEMPTING",     className: "bg-green-600 text-white animate-pulse" },
  LINKED_PREEMPT_WAITING: { label: "Waiting",        className: "bg-yellow-500 text-black" },
};

const LOG_STATUS_BADGE = {
  confirmed: "bg-green-700 text-white",
  sent:      "bg-blue-700 text-white",
  validated: "bg-blue-800 text-white",
  rejected:  "bg-red-700 text-white",
  failed:    "bg-red-800 text-white",
  pending:   "bg-neutral-600 text-white",
};

function relativeTime(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export function PreemptionControlPanel({ adapter }) {
  const [zoneConfigs,      setZoneConfigs]      = useState([]);
  const [selectedZoneId,   setSelectedZoneId]   = useState(null);
  const [preemptStatus,    setPreemptStatus]    = useState(null);
  const [commandLog,       setCommandLog]       = useState([]);
  const [lastLogId,        setLastLogId]        = useState(null);
  const [sending,          setSending]          = useState(false);
  const [clearing,         setClearing]         = useState(false);
  const [feedback,         setFeedback]         = useState(null); // { type: 'success'|'error', message }

  // Load zone configs for this intersection
  useEffect(() => {
    if (!adapter?.intersectionId) return;
    fetchPreemptionZoneConfigs(adapter.intersectionId)
      .then((configs) => {
        setZoneConfigs(configs);
        if (configs.length > 0) setSelectedZoneId(configs[0].id);
      })
      .catch(() => {});
  }, [adapter?.intersectionId]);

  const loadLog = useCallback(() => {
    if (!selectedZoneId) return;
    fetchPreemptionCommandLog({ zoneConfigId: selectedZoneId, limit: 5 })
      .then(setCommandLog)
      .catch(() => {});
  }, [selectedZoneId]);

  const loadStatus = useCallback(() => {
    if (!selectedZoneId) return;
    fetchPreemptionStatus(selectedZoneId)
      .then(setPreemptStatus)
      .catch(() => {});
  }, [selectedZoneId]);

  // Poll preemption status every 5 seconds
  useEffect(() => {
    if (!selectedZoneId) return;
    loadStatus();
    loadLog();
    const timer = setInterval(loadStatus, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [selectedZoneId, loadStatus, loadLog]);

  const handleSend = async () => {
    if (!selectedZoneId) return;
    setSending(true);
    setFeedback(null);
    try {
      const result = await triggerPreemption({
        preemptionZoneConfigId: selectedZoneId,
        triggeredBy: "operator",
      });
      if (result.approved) {
        setLastLogId(result.logId);
        setFeedback({ type: "success", message: "Preemption call sent successfully." });
      } else {
        setFeedback({ type: "error", message: result.violations?.join("; ") || "Rejected by validator." });
      }
    } catch (err) {
      setFeedback({ type: "error", message: err.message });
    } finally {
      setSending(false);
      loadLog();
      loadStatus();
    }
  };

  const handleClear = async () => {
    if (!lastLogId) return;
    setClearing(true);
    setFeedback(null);
    try {
      await clearPreemption(lastLogId);
      setFeedback({ type: "success", message: "Preemption cleared." });
    } catch (err) {
      setFeedback({ type: "error", message: err.message });
    } finally {
      setClearing(false);
      loadLog();
      loadStatus();
    }
  };

  const liveActive = preemptStatus?.liveStatus?.active ?? [];
  const isActive   = liveActive.length > 0;

  const rawStateLabel = isActive ? "PREEMPTING" : "INACTIVE";
  const statusBadge   = STATUS_BADGE[rawStateLabel] ?? STATUS_BADGE.INACTIVE;

  if (zoneConfigs.length === 0) {
    return (
      <div className="text-sm text-neutral-500 py-4 text-center">
        No preemption zone configs found for this intersection.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Zone selector */}
      <div>
        <p className="text-xs text-neutral-400 mb-1 uppercase tracking-wide">Zone Config</p>
        <Select
          value={selectedZoneId ? String(selectedZoneId) : ""}
          onValueChange={(v) => setSelectedZoneId(Number(v))}
        >
          <SelectTrigger className="bg-neutral-800 border-neutral-700 text-neutral-200 text-sm">
            <SelectValue placeholder="Select zone…" />
          </SelectTrigger>
          <SelectContent className="bg-neutral-800 border-neutral-700">
            {zoneConfigs.map((c) => (
              <SelectItem key={c.id} value={String(c.id)} className="text-neutral-200">
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status + controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400">Status:</span>
          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${statusBadge.className}`}>
            {statusBadge.label}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-neutral-500"
          onClick={() => { loadStatus(); loadLog(); }}
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              className="flex-1 gap-1.5 bg-green-700 hover:bg-green-600 text-white text-sm"
              disabled={sending || isActive}
            >
              <Zap className="h-3.5 w-3.5" />
              {sending ? "Sending…" : "Send Preemption"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-neutral-900 border-neutral-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-neutral-100">Confirm Preemption Call</AlertDialogTitle>
              <AlertDialogDescription className="text-neutral-400">
                This will assert a preemption request on the controller. The system will validate
                pedestrian clearance and timing constraints before sending.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-neutral-800 border-neutral-700 text-neutral-200 hover:bg-neutral-700">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-green-700 hover:bg-green-600 text-white"
                onClick={handleSend}
              >
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button
          variant="destructive"
          className="flex-1 gap-1.5 text-sm"
          disabled={clearing || !isActive || !lastLogId}
          onClick={handleClear}
        >
          <X className="h-3.5 w-3.5" />
          {clearing ? "Clearing…" : "Clear"}
        </Button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`text-xs rounded px-2 py-1.5 ${
          feedback.type === "success"
            ? "bg-green-900/40 text-green-300 border border-green-700/40"
            : "bg-red-900/40 text-red-300 border border-red-700/40"
        }`}>
          {feedback.message}
        </div>
      )}

      {/* Recent command log */}
      {commandLog.length > 0 && (
        <div>
          <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Recent Commands</p>
          <div className="space-y-1">
            {commandLog.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between text-xs bg-neutral-800/60 rounded px-2 py-1"
              >
                <span className="text-neutral-400">{relativeTime(entry.requestedAt)}</span>
                <span className="text-neutral-300 capitalize">{entry.triggeredBy}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  LOG_STATUS_BADGE[entry.status] ?? "bg-neutral-700 text-neutral-300"
                }`}>
                  {entry.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
