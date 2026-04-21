/**
 * Controller Configuration Settings Page
 *
 * Per-intersection panel for:
 *   - Viewing / editing controller adapter records (IP, vendor, SNMP params)
 *   - Live SNMP health probe (updates firmware version + last-seen timestamp)
 *   - Live phase state readout for the configured signal group
 *   - Editing pedestrian + preemption timing constraints per zone
 *   - Triggering / clearing preemption calls with full validator feedback
 *   - Viewing preemption command history log
 *
 * Data flow:
 *   fetchControllerAdapters(intersectionId)  → adapter list
 *   probeControllerAdapter(id)               → updates firmware / last-seen
 *   fetchLivePhaseStatus(adapterId, group)   → live signal state
 *   upsertTimingConstraints(payload)         → save timing constraints row
 *   triggerPreemption({ preemptionZoneConfigId }) → validator + SNMP send
 *   fetchPreemptionCommandLog({ intersectionId }) → history
 *
 * All service functions live in client/src/services/controllers.js.
 * See that file for the full API surface and normalised response shapes.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Radio, AlertTriangle, CheckCircle, RefreshCw, Zap, ZapOff, Clock } from 'lucide-react'
import { Separator } from '@/components/ui/shadcn/separator'
import { SettingsPageWrapper } from '../components'
import {
  Card,
  CardHeader,
  CardBody,
  FieldLabel,
  TextInput,
  OutlineButton,
  StatusBadge,
  PrimaryButton,
} from '@/components/ui/global/subcomponents'
import {
  fetchControllerAdapters,
  probeControllerAdapter,
  fetchLivePhaseStatus,
  upsertTimingConstraints,
  fetchTimingConstraints,
  triggerPreemption,
  clearPreemption,
  fetchPreemptionCommandLog,
} from '@/services/controllers'
import { fetchPreemptionZoneConfigs } from '@/services/preemptionZoneConfigs'

// ── Constants ─────────────────────────────────────────────────────────────────

const ADAPTER_TYPES = [
  { value: 'ntcip1202',       label: 'NTCIP 1202 (Generic)' },
  { value: 'siemens_m60',     label: 'Siemens M60 + SEPAC' },
  { value: 'econolite_aries', label: 'Econolite ARIES/Cobalt' },
  { value: 'peek_ada',        label: 'Peek ATC/ADA' },
  { value: 'generic_snmp',    label: 'Generic SNMP Fallback' },
]

// Phase label → badge colour mapping
const PHASE_COLOURS = {
  GREEN:     'text-green-400',
  WALK:      'text-green-300',
  PED_CLEAR: 'text-yellow-300',
  YELLOW:    'text-yellow-400',
  RED:       'text-red-400',
  RED_CLEAR: 'text-red-300',
}

// ── Sub-components ────────────────────────────────────────────────────────────

/**
 * Shows the live connection status badge for a controller adapter.
 * status: 'active' | 'offline' | 'maintenance'
 */
function ConnectionStatusBadge({ status }) {
  // TODO: render a coloured dot + status text
  // active → green dot, offline → red dot, maintenance → yellow dot
  // HINT: use inline style or Tailwind classes; StatusBadge from subcomponents
  //       is a good wrapper
  return <StatusBadge>{status ?? '—'}</StatusBadge>
}

/**
 * Displays the live phase state for one signal group.
 * phaseState shape: { label, green, yellow, red, walk, pedClear, source }
 */
function PhaseStateBadge({ phaseState }) {
  if (!phaseState) return <span className="text-sm text-[#a1a1a1]">—</span>

  const colour = PHASE_COLOURS[phaseState.label] ?? 'text-[#fafafa]'

  // TODO: render the phase label with appropriate colour and a source tag
  // HINT: source will be 'ntcip1202', 'siemens_m60_sepac', or 'stub'
  //       show it as a small greyed-out note beside the label
  return (
    <span className={`text-sm font-mono font-semibold ${colour}`}>
      {phaseState.label}
    </span>
  )
}

/**
 * Compact row for one preemption zone config showing its validator result
 * after a trigger attempt.
 */
function ValidatorFeedback({ result }) {
  if (!result) return null

  // TODO: if result.approved render a green checkmark + warnings list
  //       if not approved render a red warning icon + violations list
  // HINT: result shape: { approved, violations: string[], warnings: string[] }
  return (
    <div className="rounded-lg px-3 py-2 text-sm" style={{ border: '1px solid #262626' }}>
      {result.approved
        ? <span className="text-green-400 flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" /> Approved</span>
        : <span className="text-red-400 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Rejected</span>
      }
      {/* TODO: render result.violations and result.warnings as <ul> lists */}
    </div>
  )
}

// ── Section: Adapter Panel ────────────────────────────────────────────────────

function AdapterPanel({ intersectionId }) {
  const [adapters, setAdapters]       = useState([])
  const [loading, setLoading]         = useState(false)
  const [probing, setProbing]         = useState(null)  // adapter id being probed
  const [error, setError]             = useState(null)

  const load = useCallback(async () => {
    if (!intersectionId) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchControllerAdapters(intersectionId)
      setAdapters(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [intersectionId])

  useEffect(() => { load() }, [load])

  async function handleProbe(adapterId) {
    setProbing(adapterId)
    try {
      const updated = await probeControllerAdapter(adapterId)
      // Replace the probed adapter in local state with the updated row
      setAdapters(prev => prev.map(a => a.id === adapterId ? updated : a))
    } catch (err) {
      // TODO: surface probe error to the user (e.g. set a per-adapter error field)
    } finally {
      setProbing(null)
    }
  }

  // TODO: implement handleCreate, handleEdit, handleDelete
  // HINT: for create/edit, a modal or inline form with TextInput fields for:
  //   label, ipAddress, snmpPort, snmpCommunity, adapterType, timeoutSeconds, retryCount
  // Call createControllerAdapter(payload) / updateControllerAdapter(id, payload) from service

  return (
    <Card>
      <CardHeader
        title="Controller Adapters"
        description="Physical signal controller connection settings for this intersection"
      />
      <CardBody>
        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        {loading && (
          <p className="text-sm text-[#a1a1a1]">Loading adapters…</p>
        )}

        {!loading && adapters.length === 0 && (
          <p className="text-sm text-[#a1a1a1]">
            No controller adapters configured for this intersection.
          </p>
        )}

        {adapters.map(adapter => (
          <div key={adapter.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#fafafa]">{adapter.label || adapter.ipAddress}</p>
                <p className="text-xs text-[#a1a1a1] mt-0.5">
                  {adapter.adapterType} · {adapter.ipAddress}:{adapter.snmpPort}
                  {adapter.firmwareVersion && ` · ${adapter.firmwareVersion}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ConnectionStatusBadge status={adapter.connectionStatus} />
                <OutlineButton
                  className="h-7 text-xs"
                  onClick={() => handleProbe(adapter.id)}
                  disabled={probing === adapter.id}
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${probing === adapter.id ? 'animate-spin' : ''}`} />
                  Probe
                </OutlineButton>
              </div>
            </div>
            {adapter.lastSeenAt && (
              <p className="text-xs text-[#a1a1a1]">
                Last seen: {new Date(adapter.lastSeenAt).toLocaleString()}
              </p>
            )}
            <Separator className="bg-[#262626]" />
          </div>
        ))}

        {/* TODO: add "+ Add Controller" button that opens create form */}
        <OutlineButton className="w-full" onClick={() => { /* TODO: open create form */ }}>
          + Add Controller Adapter
        </OutlineButton>
      </CardBody>
    </Card>
  )
}

// ── Section: Live Phase Monitor ───────────────────────────────────────────────

function LivePhaseMonitor({ intersectionId }) {
  const [zones, setZones]           = useState([])
  const [phaseStates, setPhaseStates] = useState({})  // keyed by zoneConfigId
  const [loading, setLoading]       = useState(false)
  const [polling, setPolling]       = useState(false)

  useEffect(() => {
    if (!intersectionId) return
    fetchPreemptionZoneConfigs(intersectionId).then(setZones).catch(() => {})
  }, [intersectionId])

  async function refreshAllPhases() {
    // TODO: for each zone in zones:
    //   1. find the matching adapter by controller_ip (or load adapter list)
    //   2. call fetchLivePhaseStatus(adapterId, zone.signalGroup)
    //   3. update phaseStates[zone.id] with the result
    // HINT: run fetches in parallel with Promise.allSettled so one failure
    //       doesn't block the others
    setPolling(true)
    try {
      // TODO: implement
    } finally {
      setPolling(false)
    }
  }

  return (
    <Card>
      <CardHeader
        title="Live Phase States"
        description="Real-time signal phase status pulled directly from the controller"
      />
      <CardBody>
        <div className="flex justify-end">
          <OutlineButton className="h-7 text-xs" onClick={refreshAllPhases} disabled={polling}>
            <RefreshCw className={`h-3 w-3 mr-1 ${polling ? 'animate-spin' : ''}`} />
            Refresh All
          </OutlineButton>
        </div>

        {zones.length === 0 && (
          <p className="text-sm text-[#a1a1a1]">No preemption zones configured.</p>
        )}

        {zones.map(zone => (
          <div key={zone.id} className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-[#fafafa]">{zone.name}</p>
              <p className="text-xs text-[#a1a1a1]">Signal group {zone.signalGroup}</p>
            </div>
            <PhaseStateBadge phaseState={phaseStates[zone.id] ?? null} />
          </div>
        ))}
      </CardBody>
    </Card>
  )
}

// ── Section: Timing Constraints Editor ───────────────────────────────────────

function TimingConstraintsEditor({ zone }) {
  // zone: normalised preemption zone config row (from fetchPreemptionZoneConfigs)

  const [constraints, setConstraints] = useState(null)
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [error, setError]             = useState(null)

  useEffect(() => {
    if (!zone?.id) return
    fetchTimingConstraints(zone.id)
      .then(data => setConstraints(data ?? {
        // Sensible MUTCD-compliant defaults if no row exists yet
        minGreenBeforePreemptS: 7,
        pedWalkIntervalS:       7,
        pedClearanceIntervalS:  11,
        yellowChangeIntervalS:  4,
        allRedClearanceS:       2,
        preemptGreenHoldS:      20,
        maxPreemptDurationS:    60,
        minCallIntervalS:       30,
      }))
      .catch(() => {})
  }, [zone?.id])

  function handleChange(field, value) {
    setConstraints(prev => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const updated = await upsertTimingConstraints({
        preemptionZoneConfigId: zone.id,
        ...constraints,
      })
      setConstraints(updated)
      setSaved(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!constraints) return null

  // Each row: { label, field, hint }
  const fields = [
    { label: 'Min Green Before Preempt (s)',  field: 'minGreenBeforePreemptS',  hint: 'NEMA TS2 §4.2.5' },
    { label: 'Pedestrian Walk Interval (s)',  field: 'pedWalkIntervalS',        hint: 'MUTCD 4E.09 min 7s' },
    { label: 'Pedestrian Clearance (s)',      field: 'pedClearanceIntervalS',   hint: 'MUTCD 4E.08' },
    { label: 'Yellow Change Interval (s)',    field: 'yellowChangeIntervalS',   hint: 'NEMA TS2' },
    { label: 'All-Red Clearance (s)',         field: 'allRedClearanceS',        hint: 'NEMA TS2 §4.2.5' },
    { label: 'Preemption Green Hold (s)',     field: 'preemptGreenHoldS',       hint: 'How long preempt green is held' },
    { label: 'Max Preemption Duration (s)',   field: 'maxPreemptDurationS',     hint: 'Hard cap before auto-return' },
    { label: 'Min Call Interval (s)',         field: 'minCallIntervalS',        hint: 'Cooldown between successive calls' },
  ]

  return (
    <div className="space-y-3">
      {fields.map(({ label, field, hint }) => (
        <div key={field}>
          <FieldLabel>{label}</FieldLabel>
          <div className="flex items-center gap-2">
            <TextInput
              type="number"
              value={constraints[field] ?? ''}
              onChange={e => handleChange(field, parseFloat(e.target.value))}
              placeholder="0"
            />
            <span className="text-xs text-[#a1a1a1] whitespace-nowrap">{hint}</span>
          </div>
        </div>
      ))}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <OutlineButton onClick={handleSave} disabled={saving} className="h-8 text-sm">
          {saving ? 'Saving…' : 'Save Constraints'}
        </OutlineButton>
        {saved && <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Saved</span>}
      </div>
    </div>
  )
}

// ── Section: Preemption Control Panel ────────────────────────────────────────

function PreemptionControlPanel({ intersectionId }) {
  const [zones, setZones]           = useState([])
  const [selectedZone, setSelected] = useState(null)
  const [validatorResult, setResult] = useState(null)
  const [triggering, setTriggering]  = useState(false)
  const [activeLogId, setActiveLogId] = useState(null)

  useEffect(() => {
    if (!intersectionId) return
    fetchPreemptionZoneConfigs(intersectionId)
      .then(data => {
        setZones(data)
        if (data.length > 0) setSelected(data[0])
      })
      .catch(() => {})
  }, [intersectionId])

  async function handleTrigger() {
    if (!selectedZone) return
    setTriggering(true)
    setResult(null)
    try {
      const result = await triggerPreemption({
        preemptionZoneConfigId: selectedZone.id,
        triggeredBy: 'operator',
      })
      setResult(result)
      if (result.approved) setActiveLogId(result.logId)
    } catch (err) {
      setResult({ approved: false, violations: [err.message], warnings: [] })
    } finally {
      setTriggering(false)
    }
  }

  async function handleClear() {
    if (!activeLogId) return
    try {
      await clearPreemption(activeLogId)
      setActiveLogId(null)
      setResult(null)
    } catch (err) {
      // TODO: surface error
    }
  }

  return (
    <Card>
      <CardHeader
        title="Preemption Control"
        description="Trigger or clear a preemption call after NEMA TS2 / MUTCD validation"
      />
      <CardBody>
        {zones.length === 0 ? (
          <p className="text-sm text-[#a1a1a1]">No preemption zones configured for this intersection.</p>
        ) : (
          <>
            <div>
              <FieldLabel>Preemption Zone</FieldLabel>
              {/* TODO: replace with SelectDropdown shadcn component once wired;
                  for now a native select keeps the template minimal */}
              <select
                className="w-full rounded-lg px-3 h-9 text-sm text-[#fafafa] bg-transparent outline-none"
                style={{ background: 'rgba(38,38,38,0.3)', border: '1px solid #262626' }}
                value={selectedZone?.id ?? ''}
                onChange={e => setSelected(zones.find(z => z.id === Number(e.target.value)))}
              >
                {zones.map(z => (
                  <option key={z.id} value={z.id}>{z.name} (group {z.signalGroup})</option>
                ))}
              </select>
            </div>

            <Separator className="bg-[#262626]" />

            {selectedZone && (
              <TimingConstraintsEditor zone={selectedZone} />
            )}

            <Separator className="bg-[#262626]" />

            <ValidatorFeedback result={validatorResult} />

            <div className="flex gap-2 pt-1">
              <OutlineButton
                className="flex items-center gap-1 h-8 text-sm"
                onClick={handleTrigger}
                disabled={triggering || !!activeLogId}
              >
                <Zap className="h-3.5 w-3.5" />
                {triggering ? 'Validating…' : 'Trigger Preemption'}
              </OutlineButton>

              {activeLogId && (
                <OutlineButton
                  className="flex items-center gap-1 h-8 text-sm text-red-400"
                  onClick={handleClear}
                >
                  <ZapOff className="h-3.5 w-3.5" />
                  Clear Preemption
                </OutlineButton>
              )}
            </div>
          </>
        )}
      </CardBody>
    </Card>
  )
}

// ── Section: Command History ──────────────────────────────────────────────────

function CommandHistory({ intersectionId }) {
  const [log, setLog]         = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!intersectionId) return
    setLoading(true)
    fetchPreemptionCommandLog({ intersectionId, limit: 20 })
      .then(setLog)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [intersectionId])

  const statusColour = {
    confirmed: 'text-green-400',
    sent:      'text-blue-400',
    validated: 'text-yellow-400',
    pending:   'text-[#a1a1a1]',
    failed:    'text-red-400',
    rejected:  'text-orange-400',
  }

  return (
    <Card>
      <CardHeader
        title="Command History"
        description="Recent preemption commands and their outcomes"
      />
      <CardBody>
        {loading && <p className="text-sm text-[#a1a1a1]">Loading…</p>}

        {!loading && log.length === 0 && (
          <p className="text-sm text-[#a1a1a1]">No commands yet.</p>
        )}

        {log.map(entry => (
          <div key={entry.id} className="flex items-start justify-between gap-4 py-1">
            <div className="min-w-0">
              <p className="text-sm text-[#fafafa] truncate">
                {/* TODO: show zone name — join through preemption_zone_config_id */}
                Zone {entry.preemptionZoneConfigId}
              </p>
              <p className="text-xs text-[#a1a1a1] mt-0.5 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(entry.requestedAt).toLocaleString()} · {entry.triggeredBy}
              </p>
              {entry.errorMessage && (
                <p className="text-xs text-red-400 mt-0.5">{entry.errorMessage}</p>
              )}
            </div>
            <span className={`text-xs font-semibold shrink-0 ${statusColour[entry.status] ?? 'text-[#fafafa]'}`}>
              {entry.status.toUpperCase()}
            </span>
          </div>
        ))}
      </CardBody>
    </Card>
  )
}

// ── Page Root ─────────────────────────────────────────────────────────────────

export function ControllerConfig() {
  // TODO: in a real implementation, read the active intersectionId from
  // a shared context (e.g. SettingsContext) or a URL param so the operator
  // can switch between intersections without leaving this page.
  // For now, a local select lets you pick from the loaded intersection list.

  const [intersections, setIntersections] = useState([])
  const [selectedId, setSelectedId]       = useState(null)

  useEffect(() => {
    // TODO: fetch intersection list from /api/intersections
    //       set intersections state, default selectedId to first entry
    // HINT: this mirrors how GeoFencingMap loads intersections on mount
  }, [])

  return (
    <SettingsPageWrapper
      icon={Radio}
      title="Controller Configuration"
      description="Manage NTCIP 1202 controller connections, timing constraints, and preemption"
    >
      <div className="space-y-4">
        {/* Intersection selector */}
        <Card>
          <CardBody>
            <FieldLabel>Active Intersection</FieldLabel>
            <select
              className="w-full rounded-lg px-3 h-9 text-sm text-[#fafafa]"
              style={{ background: 'rgba(38,38,38,0.3)', border: '1px solid #262626' }}
              value={selectedId ?? ''}
              onChange={e => setSelectedId(Number(e.target.value) || null)}
            >
              <option value="">— select intersection —</option>
              {intersections.map(i => (
                <option key={i.intersection_id} value={i.intersection_id}>{i.name}</option>
              ))}
            </select>
          </CardBody>
        </Card>

        {selectedId && (
          <>
            <AdapterPanel         intersectionId={selectedId} />
            <LivePhaseMonitor     intersectionId={selectedId} />
            <PreemptionControlPanel intersectionId={selectedId} />
            <CommandHistory       intersectionId={selectedId} />
          </>
        )}
      </div>
    </SettingsPageWrapper>
  )
}

export default ControllerConfig
