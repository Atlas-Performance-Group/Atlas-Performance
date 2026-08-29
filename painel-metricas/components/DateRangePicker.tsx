"use client";

import { useState } from "react";
import { PRESETS, PRESET_LABELS, rangeForPreset, type DateRange, type PresetKey } from "@/lib/dateRanges";

export function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
}) {
  const [preset, setPreset] = useState<PresetKey>("last7");

  function applyPreset(p: PresetKey) {
    setPreset(p);
    if (p !== "custom") {
      onChange(rangeForPreset(p));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => applyPreset(p)}
            className="text-xs font-bold px-3 py-1.5 rounded-full transition"
            style={{
              background: preset === p ? "var(--gold-400)" : "transparent",
              color: preset === p ? "var(--red-950)" : "var(--ink-soft)",
              border: `1px solid ${preset === p ? "var(--gold-500)" : "var(--line-soft)"}`,
            }}
          >
            {PRESET_LABELS[p]}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs font-bold uppercase" style={{ color: "var(--ink-soft)" }}>
          De
        </label>
        <input
          type="date"
          className="atlas-input"
          value={value.start}
          max={value.end}
          onChange={(e) => {
            setPreset("custom");
            onChange({ ...value, start: e.target.value });
          }}
        />
        <label className="text-xs font-bold uppercase" style={{ color: "var(--ink-soft)" }}>
          Até
        </label>
        <input
          type="date"
          className="atlas-input"
          value={value.end}
          min={value.start}
          onChange={(e) => {
            setPreset("custom");
            onChange({ ...value, end: e.target.value });
          }}
        />
      </div>
    </div>
  );
}
