import React, { useState } from "react";
import { PhaseStatePanel } from "../controllers/PhaseStatePanel";
import { SpatMapView } from "./SpatMapView";
import { SpatOverviewGrid } from "./SpatOverviewGrid";

const CUIP_SLUGS = [
  "MLK_Broad",
  "MLK_Central",
  "MLK_Chestnut",
  "MLK_Douglas",
  "MLK_Georgia",
  "MLK_Houston",
  "MLK_Lindsay",
  "MLK_Magnolia",
  "MLK_Market",
  "MLK_Peeples",
  "MLK_Pine",
  "Lab_Device",
];

// Helper to count live streams
function useActiveLiveCount() {
  const [counts, setCounts] = useState({ live: 0, total: CUIP_SLUGS.length });

  React.useEffect(() => {
    const liveCount = { live: 0 };

    // Poll each slug to determine live status
    const interval = setInterval(() => {
      // This is a simplified version; in a real implementation you might
      // want to track this more efficiently. For now, we'll just show
      // the total count.
      liveCount.live = CUIP_SLUGS.length; // TODO: track actual live count
      setCounts({ live: liveCount.live, total: CUIP_SLUGS.length });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return counts;
}

export function SpatStreamsPage() {
  const [selectedSlug, setSelectedSlug] = useState(null);
  const counts = useActiveLiveCount();

  return (
    <div
      className="flex flex-col -mx-6 -mt-6"
      style={{ height: "calc(100vh - 88px)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-neutral-800 bg-neutral-950 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground">SPaT Streams</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Live signal phase and timing from {counts.total} CUIP intersections
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
            {counts.live} Live
          </span>
        </div>
      </div>

      {/* Body: Map + Right Panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Map - left side, takes most of the space */}
        <div className="flex-1 relative">
          <SpatMapView selectedSlug={selectedSlug} onSelect={setSelectedSlug} />
        </div>

        {/* Right panel - either overview grid or detail view */}
        <div className="w-[400px] flex-shrink-0 border-l border-neutral-800 bg-neutral-950 flex flex-col overflow-hidden">
          {selectedSlug ? (
            // Detail view: full PhaseStatePanel with back button
            <>
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 flex-shrink-0">
                <span className="text-sm font-mono text-neutral-300">{selectedSlug}</span>
                <button
                  onClick={() => setSelectedSlug(null)}
                  className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                >
                  ← Back
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <PhaseStatePanel cuipSlug={selectedSlug} />
              </div>
            </>
          ) : (
            // Default view: overview grid of all intersections
            <SpatOverviewGrid selectedSlug={selectedSlug} onSelect={setSelectedSlug} />
          )}
        </div>
      </div>
    </div>
  );
}

export default SpatStreamsPage;
