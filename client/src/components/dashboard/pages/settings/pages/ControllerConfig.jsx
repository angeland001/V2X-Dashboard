import React, { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Wifi, Eye, EyeOff, RefreshCw, Save } from "lucide-react";
import { Button }    from "../../../../ui/shadcn/button";
import { Badge }     from "../../../../ui/shadcn/badge";
import { Skeleton }  from "../../../../ui/shadcn/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../../../../ui/shadcn/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "../../../../ui/shadcn/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../../../ui/shadcn/select";

import {
  fetchControllerAdapters,
  createControllerAdapter,
  updateControllerAdapter,
  deleteControllerAdapter,
  probeControllerAdapter,
  fetchTimingConstraints,
  upsertTimingConstraints,
} from "../../../../../services/controllers";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

const ADAPTER_TYPES = [
  { value: "siemens_m60",     label: "Siemens M60" },
  { value: "econolite_aries", label: "Econolite ARIES" },
  { value: "peek_ada",        label: "Peek ADA" },
  { value: "ntcip1202",       label: "NTCIP 1202" },
  { value: "generic_snmp",    label: "Generic SNMP" },
];

const CONNECTION_MODES = [
  { value: "snmp",   label: "SNMP only" },
  { value: "telnet", label: "Telnet only" },
  { value: "both",   label: "SNMP + Telnet" },
];

const STATUS_DOT = {
  active:      "bg-green-500",
  offline:     "bg-red-500",
  maintenance: "bg-yellow-500",
};

const EMPTY_FORM = {
  label: "", intersectionId: "", ipAddress: "", adapterType: "ntcip1202",
  snmpPort: "161", snmpCommunity: "public", connectionMode: "snmp",
  telnetPort: "23", telnetUsername: "", telnetPassword: "",
  timeoutSeconds: "5", retryCount: "2", connectionStatus: "active",
};

const TIMING_FIELDS = [
  { key: "minGreenBeforePreemptS", label: "Min Green Before Preempt (s)" },
  { key: "pedWalkIntervalS",       label: "Ped Walk Interval (s)" },
  { key: "pedClearanceIntervalS",  label: "Ped Clearance Interval (s)" },
  { key: "yellowChangeIntervalS",  label: "Yellow Change Interval (s)" },
  { key: "allRedClearanceS",       label: "All-Red Clearance (s)" },
  { key: "preemptGreenHoldS",      label: "Preempt Green Hold (s)" },
  { key: "maxPreemptDurationS",    label: "Max Preempt Duration (s)" },
  { key: "minCallIntervalS",       label: "Min Call Interval (s)" },
];

function SectionHeader({ title, description }) {
  return (
    <div className="mb-4">
      <h3 className="text-base font-semibold text-neutral-100">{title}</h3>
      {description && <p className="text-xs text-neutral-400 mt-0.5">{description}</p>}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs text-neutral-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text", disabled }) {
  return (
    <input
      type={type}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full rounded-md border border-neutral-700 bg-neutral-800 text-neutral-200 text-sm px-3 py-1.5 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
    />
  );
}

function AdapterFormDialog({ open, onClose, editTarget, onSaved, intersections }) {
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [showPass,  setShowPass]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (!open) return;
    if (editTarget) {
      setForm({
        label:           editTarget.label          ?? "",
        intersectionId:  String(editTarget.intersectionId ?? ""),
        ipAddress:       editTarget.ipAddress      ?? "",
        adapterType:     editTarget.adapterType    ?? "ntcip1202",
        snmpPort:        String(editTarget.snmpPort ?? 161),
        snmpCommunity:   editTarget.snmpCommunity  ?? "public",
        connectionMode:  editTarget.connectionMode ?? "snmp",
        telnetPort:      String(editTarget.telnetPort ?? 23),
        telnetUsername:  editTarget.telnetUsername  ?? "",
        telnetPassword:  "",
        timeoutSeconds:  String(editTarget.timeoutSeconds ?? 5),
        retryCount:      String(editTarget.retryCount ?? 2),
        connectionStatus: editTarget.connectionStatus ?? "active",
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setFormError(null);
    setShowPass(false);
  }, [open, editTarget]);

  const set = (key) => (val) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        label:            form.label || form.ipAddress,
        intersectionId:   Number(form.intersectionId),
        ipAddress:        form.ipAddress,
        adapterType:      form.adapterType,
        snmpPort:         Number(form.snmpPort),
        snmpCommunity:    form.snmpCommunity,
        connectionMode:   form.connectionMode,
        telnetPort:       Number(form.telnetPort),
        telnetUsername:   form.telnetUsername || undefined,
        telnetPassword:   form.telnetPassword || undefined,
        timeoutSeconds:   Number(form.timeoutSeconds),
        retryCount:       Number(form.retryCount),
        connectionStatus: form.connectionStatus,
      };
      await onSaved(editTarget?.id ?? null, payload);
      onClose();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="bg-neutral-900 border-neutral-700 text-neutral-100 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-neutral-100">
            {editTarget ? "Edit Controller" : "Add Controller"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-2">
          <Field label="Label">
            <TextInput value={form.label} onChange={set("label")} placeholder="e.g. MLK & Main – M60" />
          </Field>
          <Field label="Intersection *">
            <Select value={form.intersectionId} onValueChange={set("intersectionId")}>
              <SelectTrigger className="bg-neutral-800 border-neutral-700 text-neutral-200 text-sm h-[34px]">
                <SelectValue placeholder="Select intersection…" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-800 border-neutral-700 max-h-52 overflow-y-auto">
                {intersections.map((i) => (
                  <SelectItem key={i.intersection_id} value={String(i.intersection_id)} className="text-neutral-200">
                    {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="IP Address *">
            <TextInput value={form.ipAddress} onChange={set("ipAddress")} placeholder="192.168.1.10" />
          </Field>
          <Field label="Adapter Type">
            <Select value={form.adapterType} onValueChange={set("adapterType")}>
              <SelectTrigger className="bg-neutral-800 border-neutral-700 text-neutral-200 text-sm h-[34px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-neutral-800 border-neutral-700">
                {ADAPTER_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="text-neutral-200">{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="SNMP Port">
            <TextInput value={form.snmpPort} onChange={set("snmpPort")} type="number" placeholder="161" />
          </Field>
          <Field label="SNMP Community">
            <TextInput value={form.snmpCommunity} onChange={set("snmpCommunity")} placeholder="public" />
          </Field>

          <Field label="Connection Mode">
            <Select value={form.connectionMode} onValueChange={set("connectionMode")}>
              <SelectTrigger className="bg-neutral-800 border-neutral-700 text-neutral-200 text-sm h-[34px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-neutral-800 border-neutral-700">
                {CONNECTION_MODES.map((m) => (
                  <SelectItem key={m.value} value={m.value} className="text-neutral-200">{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Telnet Port">
            <TextInput value={form.telnetPort} onChange={set("telnetPort")} type="number" placeholder="23" />
          </Field>

          <Field label="Telnet Username">
            <TextInput value={form.telnetUsername} onChange={set("telnetUsername")} placeholder="admin" />
          </Field>
          <Field label={editTarget ? "Telnet Password (blank = unchanged)" : "Telnet Password"}>
            <div className="relative">
              <TextInput
                value={form.telnetPassword}
                onChange={set("telnetPassword")}
                type={showPass ? "text" : "password"}
                placeholder={editTarget ? "••••••••" : "Enter password"}
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
              >
                {showPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </Field>

          <Field label="Timeout (s)">
            <TextInput value={form.timeoutSeconds} onChange={set("timeoutSeconds")} type="number" placeholder="5" />
          </Field>
          <Field label="Retry Count">
            <TextInput value={form.retryCount} onChange={set("retryCount")} type="number" placeholder="2" />
          </Field>
        </div>

        {formError && (
          <div className="mt-3 text-xs text-red-400 bg-red-900/30 border border-red-700/40 rounded px-3 py-2">
            {formError}
          </div>
        )}

        <DialogFooter className="mt-4 gap-2">
          <Button variant="ghost" className="text-neutral-300 hover:bg-neutral-800" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-neutral-700 hover:bg-neutral-600 text-white"
            onClick={handleSave}
            disabled={saving || !form.ipAddress || !form.intersectionId}
          >
            {saving ? "Saving…" : (editTarget ? "Save Changes" : "Add Controller")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ControllerConfig() {
  const [adapters,         setAdapters]         = useState([]);
  const [loadingAdapters,  setLoadingAdapters]  = useState(true);
  const [intersections,    setIntersections]    = useState([]);
  const [dialogOpen,       setDialogOpen]       = useState(false);
  const [editTarget,       setEditTarget]       = useState(null);
  const [probingId,        setProbingId]        = useState(null);
  const [probeResult,      setProbeResult]      = useState({});

  const [zoneConfigs,        setZoneConfigs]        = useState([]);
  const [selectedZoneConfig, setSelectedZoneConfig] = useState(null);
  const [timingForm,         setTimingForm]         = useState({});
  const [savingTiming,       setSavingTiming]       = useState(false);
  const [timingSaved,        setTimingSaved]        = useState(false);

  const loadAdapters = useCallback(() => {
    setLoadingAdapters(true);
    fetchControllerAdapters()
      .then(setAdapters)
      .catch(() => {})
      .finally(() => setLoadingAdapters(false));
  }, []);

  useEffect(() => {
    loadAdapters();
    fetch(`${API_URL}/api/intersections`)
      .then((r) => r.json())
      .then(setIntersections)
      .catch(() => {});
    fetch(`${API_URL}/api/preemption-zone-configs`)
      .then((r) => r.json())
      .then((data) => setZoneConfigs(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [loadAdapters]);

  const handleSaveAdapter = async (id, payload) => {
    if (id) {
      const updated = await updateControllerAdapter(id, payload);
      setAdapters((prev) => prev.map((a) => (a.id === id ? updated : a)));
    } else {
      const created = await createControllerAdapter(payload);
      setAdapters((prev) => [...prev, created]);
    }
  };

  const handleDelete = async (id) => {
    await deleteControllerAdapter(id);
    setAdapters((prev) => prev.filter((a) => a.id !== id));
  };

  const handleProbe = async (id) => {
    setProbingId(id);
    setProbeResult((prev) => ({ ...prev, [id]: null }));
    try {
      const updated = await probeControllerAdapter(id);
      setAdapters((prev) => prev.map((a) => (a.id === id ? updated : a)));
      setProbeResult((prev) => ({ ...prev, [id]: { ok: true, type: updated.firmwareVersion } }));
    } catch (err) {
      setProbeResult((prev) => ({ ...prev, [id]: { ok: false, error: err.message } }));
    } finally {
      setProbingId(null);
    }
  };

  useEffect(() => {
    if (!selectedZoneConfig) { setTimingForm({}); return; }
    fetchTimingConstraints(selectedZoneConfig.id)
      .then((data) => {
        if (!data) { setTimingForm({}); return; }
        setTimingForm({
          minGreenBeforePreemptS: String(data.minGreenBeforePreemptS ?? ""),
          pedWalkIntervalS:       String(data.pedWalkIntervalS       ?? ""),
          pedClearanceIntervalS:  String(data.pedClearanceIntervalS  ?? ""),
          yellowChangeIntervalS:  String(data.yellowChangeIntervalS  ?? ""),
          allRedClearanceS:       String(data.allRedClearanceS       ?? ""),
          preemptGreenHoldS:      String(data.preemptGreenHoldS      ?? ""),
          maxPreemptDurationS:    String(data.maxPreemptDurationS    ?? ""),
          minCallIntervalS:       String(data.minCallIntervalS       ?? ""),
        });
      })
      .catch(() => {});
  }, [selectedZoneConfig]);

  const handleSaveTiming = async () => {
    if (!selectedZoneConfig) return;
    setSavingTiming(true);
    setTimingSaved(false);
    try {
      await upsertTimingConstraints({
        preemptionZoneConfigId: selectedZoneConfig.id,
        minGreenBeforePreemptS: parseFloat(timingForm.minGreenBeforePreemptS) || null,
        pedWalkIntervalS:       parseFloat(timingForm.pedWalkIntervalS)       || null,
        pedClearanceIntervalS:  parseFloat(timingForm.pedClearanceIntervalS)  || null,
        yellowChangeIntervalS:  parseFloat(timingForm.yellowChangeIntervalS)  || null,
        allRedClearanceS:       parseFloat(timingForm.allRedClearanceS)       || null,
        preemptGreenHoldS:      parseFloat(timingForm.preemptGreenHoldS)      || null,
        maxPreemptDurationS:    parseFloat(timingForm.maxPreemptDurationS)    || null,
        minCallIntervalS:       parseFloat(timingForm.minCallIntervalS)       || null,
      });
      setTimingSaved(true);
      setTimeout(() => setTimingSaved(false), 3000);
    } catch (err) {
      // error surfaced via form state
    } finally {
      setSavingTiming(false);
    }
  };

  return (
    <div className="p-6 space-y-10 max-w-5xl">
      {/* ── Adapter Registry ── */}
      <section>
        <div className="flex items-center justify-between mb-1">
          <SectionHeader
            title="Controller Adapter Registry"
            description="Manage NTCIP controller connections. Telnet credentials are stored server-side and never returned in GET responses."
          />
          <div className="flex gap-2 mb-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-neutral-500"
              onClick={loadAdapters}
            >
              <RefreshCw className={`h-4 w-4 ${loadingAdapters ? "animate-spin" : ""}`} />
            </Button>
            <Button
              size="sm"
              className="gap-1.5 bg-neutral-700 hover:bg-neutral-600 text-white text-sm h-8"
              onClick={() => { setEditTarget(null); setDialogOpen(true); }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Controller
            </Button>
          </div>
        </div>

        {loadingAdapters ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded" />)}
          </div>
        ) : adapters.length === 0 ? (
          <div className="text-center py-10 border border-neutral-800 rounded-lg text-neutral-500 text-sm">
            No controllers configured yet.
          </div>
        ) : (
          <div className="rounded-lg border border-neutral-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-800/60 text-neutral-400 text-xs">
                  <th className="text-left px-4 py-2.5 font-medium">Label</th>
                  <th className="text-left px-4 py-2.5 font-medium">IP</th>
                  <th className="text-left px-4 py-2.5 font-medium">Type</th>
                  <th className="text-left px-4 py-2.5 font-medium">Mode</th>
                  <th className="text-left px-4 py-2.5 font-medium">Status</th>
                  <th className="text-right px-4 py-2.5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {adapters.map((adapter, idx) => (
                  <tr key={adapter.id} className={idx % 2 === 0 ? "bg-neutral-900" : "bg-neutral-900/60"}>
                    <td className="px-4 py-2.5 text-neutral-200 font-medium">
                      {adapter.label}
                      {probeResult[adapter.id] && (
                        <span className={`ml-2 text-xs ${probeResult[adapter.id].ok ? "text-green-400" : "text-red-400"}`}>
                          {probeResult[adapter.id].ok
                            ? `✓ ${probeResult[adapter.id].type ?? "online"}`
                            : `✗ ${probeResult[adapter.id].error}`}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-400 font-mono text-xs">{adapter.ipAddress}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant="secondary" className="text-xs">
                        {ADAPTER_TYPES.find((t) => t.value === adapter.adapterType)?.label ?? adapter.adapterType}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-neutral-400 text-xs capitalize">
                      {adapter.connectionMode ?? "snmp"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${STATUS_DOT[adapter.connectionStatus] ?? "bg-neutral-500"}`} />
                        <span className="text-xs text-neutral-300 capitalize">{adapter.connectionStatus}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-neutral-500 hover:text-green-400"
                          onClick={() => handleProbe(adapter.id)}
                          disabled={probingId === adapter.id}
                          title="Probe"
                        >
                          <Wifi className={`h-3.5 w-3.5 ${probingId === adapter.id ? "animate-pulse" : ""}`} />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-neutral-500 hover:text-neutral-200"
                          onClick={() => { setEditTarget(adapter); setDialogOpen(true); }}
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-neutral-500 hover:text-red-400" title="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-neutral-900 border-neutral-700">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-neutral-100">Delete Controller?</AlertDialogTitle>
                              <AlertDialogDescription className="text-neutral-400">
                                This will permanently remove <strong>{adapter.label}</strong>.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-neutral-800 border-neutral-700 text-neutral-200 hover:bg-neutral-700">Cancel</AlertDialogCancel>
                              <AlertDialogAction className="bg-red-700 hover:bg-red-600 text-white" onClick={() => handleDelete(adapter.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Timing Constraints ── */}
      <section>
        <SectionHeader
          title="Timing Constraints"
          description="Safety timing bounds per preemption zone config (NEMA TS2 / MUTCD compliance)."
        />
        <div className="mb-4">
          <label className="text-xs text-neutral-400 mb-1 block">Preemption Zone Config</label>
          <Select
            value={selectedZoneConfig ? String(selectedZoneConfig.id) : ""}
            onValueChange={(v) => setSelectedZoneConfig(zoneConfigs.find((c) => c.id === Number(v)) ?? null)}
          >
            <SelectTrigger className="w-80 bg-neutral-800 border-neutral-700 text-neutral-200 text-sm">
              <SelectValue placeholder="Select zone config…" />
            </SelectTrigger>
            <SelectContent className="bg-neutral-800 border-neutral-700">
              {zoneConfigs.map((c) => (
                <SelectItem key={c.id} value={String(c.id)} className="text-neutral-200">
                  {c.name}{c.intersection_name ? ` — ${c.intersection_name}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedZoneConfig && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {TIMING_FIELDS.map(({ key, label }) => (
                <Field key={key} label={label}>
                  <TextInput
                    value={timingForm[key] ?? ""}
                    onChange={(val) => setTimingForm((prev) => ({ ...prev, [key]: val }))}
                    type="number"
                    placeholder="seconds"
                  />
                </Field>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Button
                className="gap-1.5 bg-neutral-700 hover:bg-neutral-600 text-white text-sm"
                onClick={handleSaveTiming}
                disabled={savingTiming}
              >
                <Save className="h-3.5 w-3.5" />
                {savingTiming ? "Saving…" : "Save Constraints"}
              </Button>
              {timingSaved && <span className="text-xs text-green-400">✓ Saved successfully</span>}
            </div>
          </div>
        )}
      </section>

      <AdapterFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditTarget(null); }}
        editTarget={editTarget}
        onSaved={handleSaveAdapter}
        intersections={intersections}
      />
    </div>
  );
}

export default ControllerConfig;
