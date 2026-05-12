import React, { useState, useEffect } from "react";
import { Save, Wifi, Loader2, Check } from "lucide-react";
import { Button } from "../../../ui/shadcn/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../ui/shadcn/select";
import { updateControllerAdapter } from "../../../../services/controllers";

const ADAPTER_TYPES = [
  { value: "siemens_m60",     label: "Siemens M60" },
  { value: "econolite_aries", label: "Econolite ARIES" },
  { value: "peek_ada",        label: "Peek ADA" },
  { value: "ntcip1202",       label: "NTCIP 1202" },
  { value: "generic_snmp",    label: "Generic SNMP" },
];

const SNMP_VERSIONS = [
  { value: "v2c", label: "SNMPv2c (community string)" },
  { value: "v3",  label: "SNMPv3 (username / password)" },
  { value: "v1",  label: "SNMPv1 (legacy)" },
];

const V3_SECURITY_LEVELS = [
  { value: "authNoPriv",   label: "Auth, No Privacy" },
  { value: "authPriv",     label: "Auth + Privacy" },
  { value: "noAuthNoPriv", label: "No Auth, No Privacy" },
];

const V3_AUTH_PROTOCOLS = [
  { value: "sha",    label: "SHA-1" },
  { value: "sha256", label: "SHA-256" },
  { value: "md5",    label: "MD5" },
  { value: "sha384", label: "SHA-384" },
  { value: "sha512", label: "SHA-512" },
];

const V3_PRIV_PROTOCOLS = [
  { value: "aes",     label: "AES-128" },
  { value: "aes256b", label: "AES-256 (Blumenthal)" },
  { value: "des",     label: "DES (legacy)" },
];

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
      className="w-full rounded-md border border-neutral-700 bg-neutral-800 text-neutral-200 text-sm px-3 py-1.5 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 disabled:opacity-50"
    />
  );
}

function FormSelect({ value, onValueChange, options, placeholder, disabled }) {
  return (
    <Select value={value ?? ""} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="bg-neutral-800 border-neutral-700 text-neutral-200 text-sm h-9">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-neutral-900 border-neutral-700">
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} className="text-neutral-200 text-sm">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function initForm(adapter) {
  return {
    label:               adapter?.label               ?? "",
    ipAddress:           adapter?.ipAddress           ?? "",
    snmpPort:            String(adapter?.snmpPort      ?? 161),
    adapterType:         adapter?.adapterType          ?? "ntcip1202",
    snmpVersion:         adapter?.snmpVersion          ?? "v2c",
    snmpCommunity:       adapter?.snmpCommunity        ?? "public",
    timeoutSeconds:      String(adapter?.timeoutSeconds ?? 5),
    retryCount:          String(adapter?.retryCount     ?? 2),
    snmpV3SecurityLevel: adapter?.snmpV3SecurityLevel  ?? "authNoPriv",
    snmpV3Username:      adapter?.snmpV3Username       ?? "",
    snmpV3AuthProtocol:  adapter?.snmpV3AuthProtocol   ?? "sha",
    snmpV3AuthKey:       "",
    snmpV3PrivProtocol:  adapter?.snmpV3PrivProtocol   ?? "aes",
    snmpV3PrivKey:       "",
  };
}

export function AdapterSettingsForm({ adapter, onSaved, onProbed }) {
  const [form,      setForm]      = useState(() => initForm(adapter));
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saved,     setSaved]     = useState(false);
  const [probing,   setProbing]   = useState(false);

  useEffect(() => {
    setForm(initForm(adapter));
    setSaveError(null);
    setSaved(false);
  }, [adapter?.id]);

  const set = (key) => (val) => setForm((prev) => ({ ...prev, [key]: val }));

  const isV3      = form.snmpVersion === "v3";
  const needsPriv = isV3 && form.snmpV3SecurityLevel === "authPriv";

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const payload = {
        label:          form.label || form.ipAddress,
        ipAddress:      form.ipAddress,
        adapterType:    form.adapterType,
        snmpVersion:    form.snmpVersion,
        snmpPort:       Number(form.snmpPort),
        timeoutSeconds: Number(form.timeoutSeconds),
        retryCount:     Number(form.retryCount),
      };

      if (!isV3) {
        payload.snmpCommunity = form.snmpCommunity;
      } else {
        payload.snmpV3SecurityLevel = form.snmpV3SecurityLevel;
        payload.snmpV3Username      = form.snmpV3Username;
        payload.snmpV3AuthProtocol  = form.snmpV3AuthProtocol;
        if (form.snmpV3AuthKey) payload.snmpV3AuthKey = form.snmpV3AuthKey;
        if (needsPriv) {
          payload.snmpV3PrivProtocol = form.snmpV3PrivProtocol;
          if (form.snmpV3PrivKey) payload.snmpV3PrivKey = form.snmpV3PrivKey;
        }
      }

      const updated = await updateControllerAdapter(adapter.id, payload);
      onSaved?.(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleProbe = async () => {
    if (!onProbed) return;
    setProbing(true);
    try {
      await onProbed(adapter.id);
    } finally {
      setProbing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* ── Basic settings ── */}
      <div>
        <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-3">
          Basic Settings
        </p>
        <div className="space-y-3">
          <Field label="Label">
            <TextInput value={form.label} onChange={set("label")} placeholder="e.g. MLK & Georgia — Siemens M60" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="IP Address">
              <TextInput value={form.ipAddress} onChange={set("ipAddress")} placeholder="192.168.1.100" />
            </Field>
            <Field label="SNMP Port">
              <TextInput value={form.snmpPort} onChange={set("snmpPort")} type="number" placeholder="161" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Adapter Type">
              <FormSelect value={form.adapterType} onValueChange={set("adapterType")} options={ADAPTER_TYPES} />
            </Field>
            <Field label="Timeout (s)">
              <TextInput value={form.timeoutSeconds} onChange={set("timeoutSeconds")} type="number" placeholder="5" />
            </Field>
          </div>
          <Field label="Retry Count">
            <TextInput value={form.retryCount} onChange={set("retryCount")} type="number" placeholder="2" />
          </Field>
        </div>
      </div>

      {/* ── SNMP authentication ── */}
      <div>
        <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-3">
          SNMP Authentication
        </p>
        <div className="space-y-3">
          <Field label="SNMP Version">
            <FormSelect value={form.snmpVersion} onValueChange={set("snmpVersion")} options={SNMP_VERSIONS} />
          </Field>

          {!isV3 && (
            <Field label="Community String">
              <TextInput value={form.snmpCommunity} onChange={set("snmpCommunity")} placeholder="public" />
            </Field>
          )}

          {isV3 && (
            <>
              <Field label="Security Level">
                <FormSelect value={form.snmpV3SecurityLevel} onValueChange={set("snmpV3SecurityLevel")} options={V3_SECURITY_LEVELS} />
              </Field>
              <Field label="Username">
                <TextInput value={form.snmpV3Username} onChange={set("snmpV3Username")} placeholder="snmpuser" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Auth Protocol">
                  <FormSelect value={form.snmpV3AuthProtocol} onValueChange={set("snmpV3AuthProtocol")} options={V3_AUTH_PROTOCOLS} />
                </Field>
                <Field label="Auth Key">
                  <TextInput
                    value={form.snmpV3AuthKey}
                    onChange={set("snmpV3AuthKey")}
                    type="password"
                    placeholder="leave blank to keep"
                  />
                </Field>
              </div>
              {needsPriv && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Priv Protocol">
                    <FormSelect value={form.snmpV3PrivProtocol} onValueChange={set("snmpV3PrivProtocol")} options={V3_PRIV_PROTOCOLS} />
                  </Field>
                  <Field label="Priv Key">
                    <TextInput
                      value={form.snmpV3PrivKey}
                      onChange={set("snmpV3PrivKey")}
                      type="password"
                      placeholder="leave blank to keep"
                    />
                  </Field>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Error ── */}
      {saveError && (
        <p className="text-xs text-red-400 rounded border border-red-900/30 bg-red-950/20 px-3 py-2">
          {saveError}
        </p>
      )}

      {/* ── Actions ── */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          className="gap-1.5 bg-neutral-700 hover:bg-neutral-600 text-white text-sm"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving…</>
          ) : saved ? (
            <><Check className="h-3.5 w-3.5" />Saved</>
          ) : (
            <><Save className="h-3.5 w-3.5" />Save Changes</>
          )}
        </Button>

        <Button
          variant="outline"
          className="gap-1.5 border-neutral-700 text-neutral-300 hover:bg-neutral-800 text-sm"
          onClick={handleProbe}
          disabled={probing}
        >
          <Wifi className="h-3.5 w-3.5" />
          {probing ? "Probing…" : "Probe"}
        </Button>
      </div>
    </div>
  );
}
