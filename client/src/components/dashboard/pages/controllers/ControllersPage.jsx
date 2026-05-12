import React, { useState, useCallback } from "react";
import { Plus, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "../../../ui/shadcn/button";
import { Skeleton } from "../../../ui/shadcn/skeleton";
import { ControllerCard }        from "./ControllerCard";
import { ControllersMap }        from "./ControllersMap";
import { ControllerDetailPanel } from "./ControllerDetailPanel";
import { useControllerAdapters } from "../../../../hooks/controllers/useControllerAdapters";

export function ControllersPage() {
  const {
    adapters,
    loading,
    error,
    refresh,
    probe,
    statusCounts,
  } = useControllerAdapters();

  const [selectedAdapter, setSelectedAdapter] = useState(null);

  // When a card or map marker is selected, look up the freshest adapter state
  const handleSelect = useCallback((adapter) => {
    setSelectedAdapter(adapter);
  }, []);

  // After probe, refresh the selected adapter's data
  const handleProbed = useCallback(async (adapterId) => {
    const updated = await probe(adapterId);
    setSelectedAdapter((prev) => (prev?.id === adapterId ? updated : prev));
  }, [probe]);

  const handleClose = useCallback(() => setSelectedAdapter(null), []);

  return (
    <div
      className="flex flex-col -mx-6 -mt-6"
      style={{ height: "calc(100vh - 88px)" }}
    >
      {/* ── Header bar ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-950 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground">Traffic Controllers</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            <span className="text-green-400 font-medium">{statusCounts.active}</span> active
            <span className="mx-1.5 text-neutral-600">·</span>
            <span className="text-red-400 font-medium">{statusCounts.offline}</span> offline
            <span className="mx-1.5 text-neutral-600">·</span>
            <span className="text-yellow-400 font-medium">{statusCounts.maintenance}</span> maintenance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-neutral-500 hover:text-neutral-200"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-neutral-700 hover:bg-neutral-600 text-white text-sm h-8"
            onClick={() => window.location.assign("/dashboard/settings/controllers")}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Controller
          </Button>
        </div>
      </div>

      {/* ── Main split layout ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left column: controller list (35%) ── */}
        <div className="w-[320px] flex-shrink-0 border-r border-neutral-800 flex flex-col bg-neutral-950">
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {/* Error state */}
            {error && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-md px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Loading skeletons */}
            {loading && adapters.length === 0 && (
              <>
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-[86px] w-full rounded-lg" />
                ))}
              </>
            )}

            {/* Empty state */}
            {!loading && adapters.length === 0 && !error && (
              <div className="text-center py-12">
                <p className="text-sm text-neutral-500">No controllers configured.</p>
                <p className="text-xs text-neutral-600 mt-1">
                  Add a controller in Settings → Controller Configuration.
                </p>
              </div>
            )}

            {/* Controller cards */}
            {adapters.map((adapter) => (
              <ControllerCard
                key={adapter.id}
                adapter={adapter}
                isSelected={selectedAdapter?.id === adapter.id}
                onSelect={() => handleSelect(adapter)}
              />
            ))}
          </div>
        </div>

        {/* ── Right panel: map or detail (flex-1) ── */}
        <div className="flex-1 overflow-hidden relative">
          {selectedAdapter ? (
            <ControllerDetailPanel
              adapter={selectedAdapter}
              onClose={handleClose}
              onProbed={handleProbed}
            />
          ) : (
            <ControllersMap
              controllers={adapters}
              onSelectController={handleSelect}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default ControllersPage;
