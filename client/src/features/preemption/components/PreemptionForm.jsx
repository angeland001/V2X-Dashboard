import React from "react";
import { Button } from "../../../components/ui/shadcn/button";
import { Input } from "../../../components/ui/shadcn/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/shadcn/select";
import { Switch } from "../../../components/ui/shadcn/switch";

function ModeBanner({ selectedConfig }) {
  return (
    <div
      className={`rounded px-3 py-2 text-xs font-medium flex items-center gap-2 ${
        selectedConfig
          ? "bg-orange-500/15 border border-orange-500/40 text-orange-300"
          : "bg-zinc-800 border border-zinc-600 text-zinc-300"
      }`}
    >
      {selectedConfig ? (
        <>
          <span className="text-orange-400">✎</span>
          Editing:
          <span className="text-white font-semibold ml-1">
            {selectedConfig.name}
          </span>
        </>
      ) : (
        <>
          <span>+</span>
          New Preemption Zone
        </>
      )}
    </div>
  );
}

function SourceSpatZoneField({
  selectedConfig,
  draft,
  setDraft,
  zonesForIntersection,
  configsForIntersection,
  takenSpatZoneIds,
  isSelectedSourceMissing,
  sourceSelectValue,
  onBrowseSpatZones,
}) {
  return (
    <div>
      <label className="text-xs text-zinc-400 mb-1 block">
        Source SPaT Zone
      </label>
      <Select
        value={sourceSelectValue}
        onValueChange={(value) => {
          setDraft((prev) => ({
            ...prev,
            sourceSpatZoneId: value === "none" ? "" : value,
          }));
        }}
        disabled={!zonesForIntersection.length || !!selectedConfig}
      >
        <SelectTrigger className="bg-zinc-800 border-zinc-600 text-white text-xs h-8">
          <SelectValue placeholder="Select a saved SPaT zone..." />
        </SelectTrigger>
        <SelectContent className="dark bg-zinc-800 border-zinc-600">
          <SelectItem value="none" className="text-zinc-300 text-xs">
            Select a SPaT zone
          </SelectItem>
          {isSelectedSourceMissing && (
            <SelectItem value="missing" className="text-zinc-300 text-xs">
              Original SPaT zone unavailable
            </SelectItem>
          )}
          {zonesForIntersection.map((zone) => {
            const isTaken = takenSpatZoneIds.has(String(zone.id));
            const ownerConfig = isTaken
              ? configsForIntersection.find(
                  (c) => String(c.spatZoneId) === String(zone.id),
                )
              : null;
            return (
              <SelectItem
                key={zone.id}
                value={String(zone.id)}
                disabled={isTaken}
                className={`text-xs ${
                  isTaken ? "text-zinc-500 cursor-not-allowed" : "text-white"
                }`}
              >
                {zone.name} (SG {zone.signalGroup})
                {isTaken ? ` — used by "${ownerConfig?.name}"` : ""}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      {/* Footer row: same height (h-7) in both modes to prevent layout shifts */}
      <div className="mt-1 h-7 flex items-center">
        {selectedConfig ? (
          <span className="text-[11px] text-zinc-500">
            Source SPaT zone cannot be changed after creation.
          </span>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="w-full h-7 text-xs text-zinc-300 border border-zinc-600 bg-zinc-800 hover:bg-zinc-700"
            onClick={onBrowseSpatZones}
          >
            Browse SPaT Zones
          </Button>
        )}
      </div>
    </div>
  );
}

function StatusToggle({ draft, setDraft }) {
  const status = draft.status || "active";
  const isActive = status === "active";
  return (
    <div className="flex items-center justify-between rounded border border-zinc-700 bg-zinc-800/60 px-3 py-2.5">
      <span className="text-xs text-zinc-400">Status</span>
      <div className="flex items-center gap-2">
        <span
          className={`text-xs ${
            isActive ? "text-orange-400" : "text-zinc-500"
          }`}
        >
          {isActive ? "Active" : "Inactive"}
        </span>
        <Switch
          checked={isActive}
          onCheckedChange={(checked) =>
            setDraft((prev) => ({
              ...prev,
              status: checked ? "active" : "inactive",
            }))
          }
          className="data-[state=checked]:bg-orange-500 data-[state=unchecked]:bg-zinc-600"
        />
      </div>
    </div>
  );
}

function SelectedConfigMeta({ selectedConfig }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className="text-xs text-zinc-400 mb-1 block">Signal Group</label>
        <div className="bg-zinc-800/60 border border-zinc-700 rounded px-2 h-8 flex items-center text-xs text-zinc-300">
          {selectedConfig?.signalGroup ?? "—"}
        </div>
      </div>
      <div>
        <label className="text-xs text-zinc-400 mb-1 block">Lanes</label>
        <div className="bg-zinc-800/60 border border-zinc-700 rounded px-2 h-8 flex items-center text-xs text-zinc-300 overflow-hidden">
          {Array.isArray(selectedConfig?.laneIds) && selectedConfig.laneIds.length
            ? selectedConfig.laneIds.join(", ")
            : "—"}
        </div>
      </div>
    </div>
  );
}

export function PreemptionForm({
  selectedConfig,
  draft,
  setDraft,
  zonesForIntersection,
  configsForIntersection,
  takenSpatZoneIds,
  isSelectedSourceMissing,
  sourceSelectValue,
  isSaving,
  onSave,
  onReset,
  onBrowseSpatZones,
}) {
  const hasZones = zonesForIntersection.length > 0;

  return (
    <>
      <ModeBanner selectedConfig={selectedConfig} />

      <div>
        <label className="text-xs text-zinc-400 mb-1 block">
          Preemption Name
        </label>
        <Input
          value={draft.name}
          onChange={(e) =>
            setDraft((prev) => ({ ...prev, name: e.target.value }))
          }
          placeholder="e.g. MLK Fire Route"
          className="bg-zinc-800 border-zinc-700 text-white text-sm h-8"
        />
      </div>

      <SourceSpatZoneField
        selectedConfig={selectedConfig}
        draft={draft}
        setDraft={setDraft}
        zonesForIntersection={zonesForIntersection}
        configsForIntersection={configsForIntersection}
        takenSpatZoneIds={takenSpatZoneIds}
        isSelectedSourceMissing={isSelectedSourceMissing}
        sourceSelectValue={sourceSelectValue}
        onBrowseSpatZones={onBrowseSpatZones}
      />

      <div>
        <label className="text-xs text-zinc-400 mb-1 block">Controller IP</label>
        <Input
          value={draft.controllerIp}
          onChange={(e) =>
            setDraft((prev) => ({ ...prev, controllerIp: e.target.value }))
          }
          placeholder="Optional"
          className="bg-zinc-800 border-zinc-700 text-white text-sm h-8"
        />
      </div>

      <StatusToggle draft={draft} setDraft={setDraft} />

      {!hasZones && (
        <div className="text-xs text-zinc-500">
          No saved SPaT zones for this intersection yet. Create one in the
          SPaT page first.
        </div>
      )}

      <SelectedConfigMeta selectedConfig={selectedConfig} />

      <div className="grid grid-cols-2 gap-2">
        <Button
          size="sm"
          className="text-xs h-8 bg-orange-600 hover:bg-orange-700 text-white"
          onClick={onSave}
          disabled={isSaving || (!hasZones && !selectedConfig)}
        >
          {isSaving ? "Saving…" : selectedConfig ? "Save Changes" : "Create Zone"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-8 bg-zinc-800 text-white border border-zinc-600 hover:bg-zinc-700"
          onClick={onReset}
        >
          {selectedConfig ? "Cancel Edit" : "Clear Form"}
        </Button>
      </div>
    </>
  );
}
