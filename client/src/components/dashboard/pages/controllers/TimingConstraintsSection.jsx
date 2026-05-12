import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Pencil, Check, X, Loader2 } from "lucide-react";
import { Button }   from "../../../ui/shadcn/button";
import { Skeleton } from "../../../ui/shadcn/skeleton";
import {
  fetchTimingConstraints,
  upsertTimingConstraints,
} from "../../../../services/controllers";

const TIMING_FIELDS = [
  { key: "minGreenBeforePreemptS", label: "Min Green Before Preempt", unit: "s" },
  { key: "pedWalkIntervalS",       label: "Ped Walk Interval",        unit: "s" },
  { key: "pedClearanceIntervalS",  label: "Ped Clearance Interval",   unit: "s" },
  { key: "yellowChangeIntervalS",  label: "Yellow Change Interval",   unit: "s" },
  { key: "allRedClearanceS",       label: "All-Red Clearance",        unit: "s" },
  { key: "preemptGreenHoldS",      label: "Preempt Green Hold",       unit: "s" },
  { key: "maxPreemptDurationS",    label: "Max Preempt Duration",     unit: "s" },
  { key: "minCallIntervalS",       label: "Min Call Interval",        unit: "s" },
];

export function TimingConstraintsSection({ zoneConfigId }) {
  const [isOpen,      setIsOpen]      = useState(false);
  const [constraints, setConstraints] = useState(null);
  const [form,        setForm]        = useState({});
  const [loadError,   setLoadError]   = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [editing,     setEditing]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [saveError,   setSaveError]   = useState(null);

  useEffect(() => {
    if (!zoneConfigId) {
      setConstraints(null);
      setForm({});
      setIsOpen(false);
      return;
    }
    setLoadingData(true);
    setLoadError(null);
    fetchTimingConstraints(zoneConfigId)
      .then((data) => {
        setConstraints(data);
        const init = {};
        for (const { key } of TIMING_FIELDS) {
          init[key] = data?.[key] != null ? String(data[key]) : "";
        }
        setForm(init);
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoadingData(false));
  }, [zoneConfigId]);

  if (!zoneConfigId) return null;

  const handleCancel = () => {
    const init = {};
    for (const { key } of TIMING_FIELDS) {
      init[key] = constraints?.[key] != null ? String(constraints[key]) : "";
    }
    setForm(init);
    setEditing(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const payload = { preemptionZoneConfigId: zoneConfigId };
      for (const { key } of TIMING_FIELDS) {
        const v = parseFloat(form[key]);
        if (!isNaN(v) && v >= 0) payload[key] = v;
      }
      const updated = await upsertTimingConstraints(payload);
      setConstraints(updated);
      setEditing(false);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-neutral-800 overflow-hidden">
      {/* Accordion header */}
      <button
        className="w-full flex items-center justify-between px-3 py-2 bg-neutral-900/60 hover:bg-neutral-800/60 transition-colors"
        onClick={() => setIsOpen((v) => !v)}
      >
        <span className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
          Timing Constraints
        </span>
        <div className="flex items-center gap-2">
          {!isOpen && constraints && (
            <span className="text-[10px] text-neutral-600 font-mono">
              min green {constraints.minGreenBeforePreemptS ?? "—"}s
            </span>
          )}
          {isOpen
            ? <ChevronUp className="h-3.5 w-3.5 text-neutral-500" />
            : <ChevronDown className="h-3.5 w-3.5 text-neutral-500" />
          }
        </div>
      </button>

      {/* Accordion body */}
      <div className={isOpen ? "" : "hidden"}>
        <div className="px-3 py-2.5">
          {loadError && (
            <p className="text-xs text-red-400 mb-2">{loadError}</p>
          )}

          {/* Table header + edit button */}
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-neutral-600 uppercase tracking-wide">
              NEMA TS2 / MUTCD safety bounds
            </span>
            {!editing && (
              <Button
                variant="ghost" size="icon"
                className="h-5 w-5 text-neutral-500 hover:text-neutral-200"
                onClick={() => setEditing(true)}
                title="Edit timing constraints"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
            {editing && (
              <div className="flex gap-1">
                <Button
                  variant="ghost" size="icon"
                  className="h-5 w-5 text-neutral-400 hover:text-neutral-200"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  <X className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  className="h-5 w-5 bg-green-700 hover:bg-green-600 text-white"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <Check className="h-3 w-3" />
                  }
                </Button>
              </div>
            )}
          </div>

          <div className="rounded-md border border-neutral-800 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-neutral-800/60">
                  <th className="text-left px-3 py-1.5 text-neutral-400 font-medium">Parameter</th>
                  <th className="text-right px-3 py-1.5 text-neutral-400 font-medium">Value (s)</th>
                </tr>
              </thead>
              <tbody>
                {TIMING_FIELDS.map(({ key, label }, idx) => (
                  <tr key={key} className={idx % 2 === 0 ? "bg-neutral-900" : "bg-neutral-900/50"}>
                    <td className="px-3 py-1.5 text-neutral-300">{label}</td>
                    <td className="px-3 py-1.5 text-right">
                      {loadingData ? (
                        <Skeleton className="h-3 w-10 ml-auto" />
                      ) : editing ? (
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={form[key] ?? ""}
                          onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                          className="w-20 rounded border border-neutral-600 bg-neutral-800 text-neutral-200 text-xs px-2 py-0.5 text-right focus:outline-none focus:ring-1 focus:ring-neutral-500"
                        />
                      ) : constraints?.[key] != null ? (
                        <span className="font-mono text-neutral-200">
                          {Number(constraints[key]).toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-neutral-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {saveError && (
            <p className="text-xs text-red-400 mt-1.5">{saveError}</p>
          )}
          {editing && !saveError && (
            <p className="text-xs text-neutral-600 mt-1.5">
              Saved to the database — not written to the controller via SNMP.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
