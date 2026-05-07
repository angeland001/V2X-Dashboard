import React, { useState, useEffect } from "react";
import { Pencil, Check, X, Loader2, Lock } from "lucide-react";
import { Button }   from "../../../ui/shadcn/button";
import { Skeleton } from "../../../ui/shadcn/skeleton";
import { updateTimingParameters } from "../../../../services/controllers";

const ROWS = [
  { key: "minGreen_s",     label: "Min Green" },
  { key: "maxGreen_s",     label: "Max Green" },
  { key: "walk_s",         label: "Walk" },
  { key: "pedClear_s",     label: "Ped Clear" },
  { key: "yellowChange_s", label: "Yellow Change" },
  { key: "redClearance_s", label: "Red Clearance" },
];

export function TimingParametersTable({ adapterId, signalGroup, timingData, loading }) {
  const [editing,   setEditing]   = useState(false);
  const [form,      setForm]      = useState({});
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [readOnly,  setReadOnly]  = useState(false);

  // Sync form when timingData arrives (and not mid-edit)
  useEffect(() => {
    if (editing) return;
    if (!timingData) return;
    const init = {};
    for (const { key } of ROWS) {
      init[key] = timingData[key] != null ? String(timingData[key]) : "";
    }
    setForm(init);
  }, [timingData, editing]);

  const handleCancel = () => {
    setEditing(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const params = {};
      for (const { key } of ROWS) {
        const v = parseFloat(form[key]);
        if (!isNaN(v) && v >= 0) params[key] = v;
      }
      await updateTimingParameters(adapterId, signalGroup, params);
      setEditing(false);
    } catch (err) {
      setSaveError(err.message);
      if (err.message?.includes("does not support timing writes")) {
        setReadOnly(true);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const canEdit = Boolean(adapterId && signalGroup && !loading && !readOnly);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide flex items-center gap-1.5">
          Timing Parameters — Phase {signalGroup}
          {readOnly && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-normal normal-case text-neutral-500">
              <Lock className="h-2.5 w-2.5" /> read-only
            </span>
          )}
        </p>
        {canEdit && (
          editing ? (
            <div className="flex gap-1">
              <Button
                variant="ghost" size="icon"
                className="h-6 w-6 text-neutral-400 hover:text-neutral-200"
                onClick={handleCancel}
                disabled={saving}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                className="h-6 w-6 bg-green-700 hover:bg-green-600 text-white"
                onClick={handleSave}
                disabled={saving}
              >
                {saving
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Check className="h-3.5 w-3.5" />}
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost" size="icon"
              className="h-6 w-6 text-neutral-500 hover:text-neutral-200"
              onClick={() => setEditing(true)}
              title="Edit timing on controller"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )
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
            {ROWS.map(({ key, label }, idx) => (
              <tr key={key} className={idx % 2 === 0 ? "bg-neutral-900" : "bg-neutral-900/50"}>
                <td className="px-3 py-1.5 text-neutral-300">{label}</td>
                <td className="px-3 py-1.5 text-right">
                  {loading ? (
                    <Skeleton className="h-3 w-12 ml-auto" />
                  ) : editing ? (
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={form[key] ?? ""}
                      onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="w-24 rounded border border-neutral-600 bg-neutral-800 text-neutral-200 text-xs px-2 py-0.5 text-right focus:outline-none focus:ring-1 focus:ring-neutral-500"
                    />
                  ) : timingData?.[key] != null ? (
                    <span className="font-mono text-neutral-200">{timingData[key].toFixed(1)}</span>
                  ) : (
                    <span className="text-neutral-600">N/A</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {readOnly ? (
        <p className="text-xs text-neutral-500 mt-1.5">
          This controller does not support timing writes via SNMP.
        </p>
      ) : saveError ? (
        <p className="text-xs text-red-400 mt-1.5">{saveError}</p>
      ) : editing ? (
        <p className="text-xs text-neutral-500 mt-1.5">
          Changes are written to the controller via SNMP SET.
        </p>
      ) : null}
    </div>
  );
}
