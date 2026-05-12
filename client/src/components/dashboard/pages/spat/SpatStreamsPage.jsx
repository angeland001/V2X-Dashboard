import React, { useState } from "react";
import { Radio } from "lucide-react";
import { PhaseStatePanel } from "../controllers/PhaseStatePanel";

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
];

export function SpatStreamsPage() {
  const [selectedSlug, setSelectedSlug] = useState(null);

  return (
    <div
      className="flex flex-col -mx-6 -mt-6"
      style={{ height: "calc(100vh - 88px)" }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-950 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground">SPaT Streams</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Live signal phase and timing from CUIP intersection streams
          </p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Slug list */}
        <div className="w-[220px] flex-shrink-0 border-r border-neutral-800 flex flex-col bg-neutral-950">
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {CUIP_SLUGS.map((slug) => (
              <button
                key={slug}
                onClick={() => setSelectedSlug(slug)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-xs font-mono ${
                  selectedSlug === slug
                    ? "bg-neutral-700 text-neutral-100"
                    : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Radio className="h-3 w-3 flex-shrink-0" />
                  {slug}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Phase state detail */}
        <div className="flex-1 overflow-y-auto p-4">
          {selectedSlug ? (
            <PhaseStatePanel cuipSlug={selectedSlug} />
          ) : (
            <div className="flex items-center justify-center h-full text-neutral-600 text-sm">
              Select a stream to view live phase data
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SpatStreamsPage;
