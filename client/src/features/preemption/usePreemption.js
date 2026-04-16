import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createPreemptionZoneConfig,
  deletePreemptionZoneConfigById,
  fetchPreemptionZoneConfigs,
  updatePreemptionZoneConfigById,
} from "./services/preemptionZoneConfigs";
import { draftFromPreemptionConfig, makeEmptyPreemptionDraft } from "./draft";

/**
 * Owns all preemption-zone state, data loading, effects, and mutations.
 *
 * @param {object}   params
 * @param {number|string|null} params.activeIntersectionId
 * @param {Array}    params.spatZones            All SPaT zones across intersections.
 * @param {(msg: string, level?: "info"|"error") => void} params.showMessage
 */
export function usePreemption({ activeIntersectionId, spatZones, showMessage }) {
  const [configs, setConfigs] = useState([]);
  const [selectedConfigId, setSelectedConfigId] = useState(null);
  const [draft, setDraft] = useState(makeEmptyPreemptionDraft());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadedIntersectionId, setLoadedIntersectionId] = useState(null);

  const zonesForIntersection = useMemo(() => {
    if (activeIntersectionId == null) return [];
    return spatZones.filter(
      (z) => String(z.intersectionId) === String(activeIntersectionId),
    );
  }, [spatZones, activeIntersectionId]);

  const configsForIntersection = useMemo(() => {
    if (activeIntersectionId == null) return [];
    return configs.filter(
      (c) => String(c.intersectionId) === String(activeIntersectionId),
    );
  }, [configs, activeIntersectionId]);

  const selectedConfig = useMemo(() => {
    if (!selectedConfigId) return null;
    return (
      configsForIntersection.find(
        (c) => String(c.id) === String(selectedConfigId),
      ) || null
    );
  }, [configsForIntersection, selectedConfigId]);

  // Set of SPaT zone ids already claimed by *other* preemption configs for this
  // intersection. Excludes the currently-selected config's own source so the
  // edit UI doesn't mark the user's own zone as taken.
  const takenSpatZoneIds = useMemo(() => {
    const ownSpatZoneId =
      selectedConfig?.spatZoneId != null
        ? String(selectedConfig.spatZoneId)
        : null;
    const taken = new Set();
    for (const c of configsForIntersection) {
      if (c.spatZoneId == null) continue;
      const id = String(c.spatZoneId);
      if (id === ownSpatZoneId) continue;
      taken.add(id);
    }
    return taken;
  }, [configsForIntersection, selectedConfig]);

  const selectedSourceZone = useMemo(() => {
    if (selectedConfig?.spatZoneId == null) return null;
    return (
      zonesForIntersection.find(
        (z) => String(z.id) === String(selectedConfig.spatZoneId),
      ) || null
    );
  }, [selectedConfig, zonesForIntersection]);

  const isSelectedSourceMissing = Boolean(
    selectedConfig && draft.sourceSpatZoneId && !selectedSourceZone,
  );

  const sourceSelectValue = isSelectedSourceMissing
    ? "missing"
    : draft.sourceSpatZoneId || "none";

  const selectedConfigRef = useRef(null);
  useEffect(() => {
    selectedConfigRef.current = selectedConfig;
  }, [selectedConfig]);

  const loadForIntersection = useCallback(async (intId) => {
    try {
      const next = await fetchPreemptionZoneConfigs(intId);
      setConfigs(next);
      setLoadedIntersectionId(String(intId));
      setSelectedConfigId((prev) => {
        if (prev != null && next.some((c) => String(c.id) === String(prev))) {
          return String(prev);
        }
        return next[0]?.id != null ? String(next[0].id) : null;
      });
    } catch (err) {
      console.error("Failed to load preemption zone configs:", err);
      setConfigs([]);
      setLoadedIntersectionId(null);
      setSelectedConfigId(null);
    }
  }, []);

  // Reset + reload whenever the active intersection changes.
  useEffect(() => {
    if (activeIntersectionId == null) {
      setConfigs([]);
      setLoadedIntersectionId(null);
      setSelectedConfigId(null);
      setDraft(makeEmptyPreemptionDraft());
      return;
    }
    setLoadedIntersectionId(null);
    setSelectedConfigId(null);
    setDraft(makeEmptyPreemptionDraft());
    loadForIntersection(activeIntersectionId);
  }, [activeIntersectionId, loadForIntersection]);

  // Re-validate the current selection if configs change underneath us.
  useEffect(() => {
    if (activeIntersectionId == null || !selectedConfigId) return;
    if (String(loadedIntersectionId) !== String(activeIntersectionId)) return;
    const exists = configsForIntersection.some(
      (c) => String(c.id) === String(selectedConfigId),
    );
    if (!exists) {
      setSelectedConfigId(
        configsForIntersection[0]?.id != null
          ? String(configsForIntersection[0].id)
          : null,
      );
    }
  }, [
    activeIntersectionId,
    configsForIntersection,
    selectedConfigId,
    loadedIntersectionId,
  ]);

  // Sync the editable draft when the user switches to a different config.
  // Intentionally keyed on `selectedConfigId` (not `selectedConfig`) so that
  // background config refetches don't clobber unsaved edits on the same zone.
  useEffect(() => {
    if (!selectedConfigId) return;
    const config = configsForIntersection.find(
      (c) => String(c.id) === String(selectedConfigId),
    );
    if (!config) return;
    setDraft(draftFromPreemptionConfig(config));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConfigId]);

  // While creating a new zone, default the source picker to the first available SPaT zone.
  useEffect(() => {
    if (selectedConfigId) return;
    const defaultSourceId = zonesForIntersection[0]?.id;
    setDraft((prev) => {
      const hasCurrent =
        prev.sourceSpatZoneId &&
        zonesForIntersection.some(
          (z) => String(z.id) === String(prev.sourceSpatZoneId),
        );
      if (hasCurrent) return prev;
      if (defaultSourceId == null) {
        return prev.sourceSpatZoneId ? { ...prev, sourceSpatZoneId: "" } : prev;
      }
      return { ...prev, sourceSpatZoneId: String(defaultSourceId) };
    });
  }, [selectedConfigId, zonesForIntersection]);

  const resetDraft = useCallback(() => {
    setSelectedConfigId(null);
    setDraft(makeEmptyPreemptionDraft(zonesForIntersection[0]?.id ?? ""));
  }, [zonesForIntersection]);

  const selectConfig = useCallback((config) => {
    setSelectedConfigId(String(config.id));
    setDraft(draftFromPreemptionConfig(config));
  }, []);

  const save = useCallback(async () => {
    if (activeIntersectionId == null) {
      showMessage("Select or create an intersection first.", "error");
      return;
    }
    if (!draft.name.trim()) {
      showMessage("Enter a preemption zone name first.", "error");
      return;
    }
    if (!selectedConfigId && !draft.sourceSpatZoneId) {
      showMessage("Choose a SPaT zone to create the preemption zone from.", "error");
      return;
    }

    setIsSaving(true);
    try {
      if (selectedConfigId) {
        const updated = await updatePreemptionZoneConfigById(selectedConfigId, {
          name: draft.name.trim(),
          controllerIp: draft.controllerIp,
          status: draft.status,
        });
        await loadForIntersection(activeIntersectionId);
        setSelectedConfigId(String(updated.id));
        setDraft(draftFromPreemptionConfig(updated));
        showMessage("Preemption zone updated.");
        return;
      }

      const created = await createPreemptionZoneConfig({
        intersectionId: activeIntersectionId,
        name: draft.name.trim(),
        sourceSpatZoneId: draft.sourceSpatZoneId,
        controllerIp: draft.controllerIp,
        status: draft.status,
      });
      await loadForIntersection(activeIntersectionId);
      setSelectedConfigId(String(created.id));
      setDraft(draftFromPreemptionConfig(created));
      showMessage("Preemption zone saved.");
    } catch (err) {
      showMessage(`Error: ${err.message}`, "error");
    } finally {
      setIsSaving(false);
    }
  }, [activeIntersectionId, draft, selectedConfigId, loadForIntersection, showMessage]);

  const remove = useCallback(async () => {
    if (!selectedConfigId) return;
    setIsSaving(true);
    try {
      await deletePreemptionZoneConfigById(selectedConfigId);
      if (activeIntersectionId != null) {
        await loadForIntersection(activeIntersectionId);
      }
      resetDraft();
      showMessage("Preemption zone deleted.");
    } catch (err) {
      showMessage(`Error: ${err.message}`, "error");
    } finally {
      setIsSaving(false);
    }
  }, [selectedConfigId, activeIntersectionId, loadForIntersection, resetDraft, showMessage]);

  return {
    configs,
    configsForIntersection,
    zonesForIntersection,
    takenSpatZoneIds,
    selectedConfig,
    selectedConfigId,
    selectedConfigRef,
    selectedSourceZone,
    isSelectedSourceMissing,
    sourceSelectValue,
    draft,
    setDraft,
    isSaving,
    showDeleteDialog,
    setShowDeleteDialog,
    resetDraft,
    selectConfig,
    save,
    remove,
  };
}
