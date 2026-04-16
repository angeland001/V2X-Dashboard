import React from "react";
import { Separator } from "../../../components/ui/shadcn/separator";
import { PreemptionForm } from "./PreemptionForm";
import { PreemptionZoneList } from "./PreemptionZoneList";
import { DeletePreemptionDialog } from "./DeletePreemptionDialog";

/**
 * Root content for the "Preemption" tab of the zone editor panel.
 * Consumes the view returned by `usePreemption` and renders the full
 * form + list + delete confirmation.
 */
export function PreemptionPanel({ preemption, onBrowseSpatZones }) {
  const {
    draft,
    setDraft,
    selectedConfig,
    selectedConfigId,
    zonesForIntersection,
    configsForIntersection,
    takenSpatZoneIds,
    isSelectedSourceMissing,
    sourceSelectValue,
    isSaving,
    showDeleteDialog,
    setShowDeleteDialog,
    resetDraft,
    selectConfig,
    save,
    remove,
  } = preemption;

  return (
    <>
      <PreemptionForm
        selectedConfig={selectedConfig}
        draft={draft}
        setDraft={setDraft}
        zonesForIntersection={zonesForIntersection}
        configsForIntersection={configsForIntersection}
        takenSpatZoneIds={takenSpatZoneIds}
        isSelectedSourceMissing={isSelectedSourceMissing}
        sourceSelectValue={sourceSelectValue}
        isSaving={isSaving}
        onSave={save}
        onReset={resetDraft}
        onBrowseSpatZones={onBrowseSpatZones}
      />

      <Separator className="bg-zinc-700" />

      <PreemptionZoneList
        configs={configsForIntersection}
        selectedConfigId={selectedConfigId}
        onSelect={selectConfig}
        onNew={resetDraft}
      />

      <DeletePreemptionDialog
        config={selectedConfig}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={remove}
        isBusy={isSaving}
      />
    </>
  );
}
