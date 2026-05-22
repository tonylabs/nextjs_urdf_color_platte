"use client";

import { useMemo, useState } from "react";
import {
  InformationCircleIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  GROUP_LABELS,
  GROUP_ORDER,
  type ColorGroup,
  type UrdfColor,
} from "@/lib/color-types";

type Props = {
  colors: UrdfColor[];
  selectedLinkName: string | null;
  onApplyColor: (color: UrdfColor) => void;
  onInspectColor: (color: UrdfColor) => void;
};

function isLight([r, g, b]: [number, number, number, number]) {
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 0.6;
}

export default function ColorPalette({
  colors,
  selectedLinkName,
  onApplyColor,
  onInspectColor,
}: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return colors;
    return colors.filter((c) => c.name.toLowerCase().includes(q));
  }, [colors, query]);

  return (
    <div className="flex h-full flex-col">
      <header className="px-4 pt-5">
        <h1 className="bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-500 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
          URDF Color Palette
        </h1>
        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
          {colors.length} named materials
        </p>
        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs dark:border-gray-800 dark:bg-gray-900">
          {selectedLinkName ? (
            <>
              <span className="text-gray-500 dark:text-gray-400">
                Selected link:&nbsp;
              </span>
              <span className="font-mono text-violet-600 dark:text-violet-300">
                {selectedLinkName}
              </span>
              <p className="mt-1 text-gray-500 dark:text-gray-400">
                Click a color to apply.
              </p>
            </>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              Click a link on the robot to start coloring. Tap{" "}
              <InformationCircleIcon className="inline h-3.5 w-3.5" /> on any
              swatch to see its URDF snippet.
            </p>
          )}
        </div>
      </header>

      <div className="px-4 pt-4">
        <div className="relative">
          <MagnifyingGlassIcon
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search colors..."
            className="w-full rounded-full border border-gray-300 bg-white py-2 pl-9 pr-8 text-sm shadow-sm transition focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-400/40 dark:border-gray-700 dark:bg-gray-900"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
              aria-label="Clear search"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
          Showing {filtered.length} of {colors.length}
        </p>
      </div>

      <div className="mt-2 flex-1 overflow-y-auto px-4 pb-6">
        <ColorGrid
          colors={filtered}
          selectedLinkName={selectedLinkName}
          onApplyColor={onApplyColor}
          onInspectColor={onInspectColor}
        />
      </div>
    </div>
  );
}

function ColorGrid({
  colors,
  selectedLinkName,
  onApplyColor,
  onInspectColor,
}: {
  colors: UrdfColor[];
  selectedLinkName: string | null;
  onApplyColor: (c: UrdfColor) => void;
  onInspectColor: (c: UrdfColor) => void;
}) {
  if (colors.length === 0) {
    return (
      <p className="py-20 text-center text-sm text-gray-500 dark:text-gray-400">
        No colors match your search.
      </p>
    );
  }

  const byGroup = new Map<ColorGroup, UrdfColor[]>();
  for (const c of colors) {
    const list = byGroup.get(c.group) ?? [];
    list.push(c);
    byGroup.set(c.group, list);
  }

  return (
    <div className="space-y-6">
      {GROUP_ORDER.filter((g) => byGroup.has(g)).map((group) => {
        const groupColors = byGroup.get(group)!;
        return (
          <section key={group}>
            <header className="mb-2 flex items-baseline justify-between border-b border-gray-200 pb-1.5 dark:border-gray-800">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                {GROUP_LABELS[group]}
              </h2>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                {groupColors.length}
              </span>
            </header>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {groupColors.map((color) => (
                <ColorTile
                  key={color.name}
                  color={color}
                  canApply={!!selectedLinkName}
                  onApply={onApplyColor}
                  onInspect={onInspectColor}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ColorTile({
  color,
  canApply,
  onApply,
  onInspect,
}: {
  color: UrdfColor;
  canApply: boolean;
  onApply: (c: UrdfColor) => void;
  onInspect: (c: UrdfColor) => void;
}) {
  const light = isLight(color.rgba);
  return (
    <div
      title={
        canApply
          ? `Apply ${color.name} to selected link`
          : `${color.name} — select a link first to apply`
      }
      className="group relative aspect-square overflow-hidden rounded-lg shadow-sm ring-1 ring-black/5 transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-lg hover:ring-2 hover:ring-violet-400 dark:ring-white/10"
    >
      <button
        type="button"
        onClick={() => onApply(color)}
        disabled={!canApply}
        aria-label={`Apply ${color.name}`}
        className={`absolute inset-0 ${canApply ? "cursor-pointer" : "cursor-not-allowed"}`}
        style={{ backgroundColor: color.hex }}
      >
        <span className="absolute inset-0 bg-white/0 transition group-hover:bg-white/10" />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onInspect(color);
        }}
        aria-label={`Show URDF snippet for ${color.name}`}
        className={`absolute right-1 top-1 z-10 rounded-full p-1 opacity-0 shadow transition group-hover:opacity-100 focus-visible:opacity-100 ${
          light
            ? "bg-black/30 text-white hover:bg-black/50"
            : "bg-white/85 text-gray-800 hover:bg-white"
        }`}
      >
        <InformationCircleIcon className="h-3.5 w-3.5" />
      </button>
      <span
        className={`pointer-events-none absolute inset-x-0 bottom-0 truncate px-1.5 py-0.5 text-[10px] font-medium opacity-0 transition-opacity duration-150 group-hover:opacity-100 ${
          light ? "text-black/80" : "text-white/95"
        }`}
        style={{
          background: light
            ? "linear-gradient(to top, rgba(255,255,255,0.7), rgba(255,255,255,0))"
            : "linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0))",
        }}
      >
        {color.name}
      </span>
    </div>
  );
}
