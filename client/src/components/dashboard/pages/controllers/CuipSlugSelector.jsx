import React, { useState } from "react";
import { Check, Radio } from "lucide-react";
import { Button } from "../../../ui/shadcn/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../ui/shadcn/select";
import { updateIntersectionCuipSlug } from "../../../../services/intersections";

const MLK_SLUGS = [
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

const NONE_VALUE = "__none__";

export function CuipSlugSelector({ intersectionId, cuipSlug, onChange }) {
  const [selected, setSelected] = useState(cuipSlug ?? NONE_VALUE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const isDirty = selected !== (cuipSlug ?? NONE_VALUE);

  const handleSave = async () => {
    if (!intersectionId) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const slug = selected === NONE_VALUE ? null : selected;
      await updateIntersectionCuipSlug(intersectionId, slug);
      setSaved(true);
      onChange?.(slug);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 px-3 py-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Radio className="h-3 w-3 text-neutral-500" />
          <span className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
            CUIP Stream
          </span>
        </div>
        {!intersectionId && (
          <span className="text-[10px] text-neutral-600">No intersection linked</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={selected}
          onValueChange={(val) => { setSelected(val); setError(null); setSaved(false); }}
          disabled={!intersectionId || saving}
        >
          <SelectTrigger className="h-7 text-xs bg-neutral-950 border-neutral-700 text-neutral-200 flex-1">
            <SelectValue placeholder="Select a corridor stream…" />
          </SelectTrigger>
          <SelectContent className="bg-neutral-900 border-neutral-700">
            <SelectItem value={NONE_VALUE} className="text-xs text-neutral-500">
              None
            </SelectItem>
            {MLK_SLUGS.map((slug) => (
              <SelectItem key={slug} value={slug} className="text-xs font-mono text-neutral-200">
                {slug}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          size="sm"
          className="h-7 text-xs px-2.5 bg-neutral-700 hover:bg-neutral-600 text-white flex-shrink-0"
          onClick={handleSave}
          disabled={!isDirty || !intersectionId || saving}
        >
          {saving ? (
            "Saving…"
          ) : saved ? (
            <><Check className="h-3 w-3 mr-1" />Saved</>
          ) : (
            "Apply"
          )}
        </Button>
      </div>

      {error && (
        <p className="text-[10px] text-red-400">{error}</p>
      )}
    </div>
  );
}
