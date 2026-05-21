"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  ClipboardDocumentIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  GROUP_LABELS,
  GROUP_ORDER,
  type ColorGroup,
  type UrdfColor,
} from "@/lib/color-types";

const ColorPreview3D = dynamic(() => import("./ColorPreview3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#0b0d10] text-xs text-gray-400">
      Loading 3D preview…
    </div>
  ),
});

type Props = {
  colors: UrdfColor[];
};

function isLight([r, g, b]: [number, number, number, number]) {
  // Perceived brightness — pick a contrasting label color.
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 0.6;
}

export default function ColorPalette({ colors }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<UrdfColor | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return colors;
    return colors.filter((c) => c.name.toLowerCase().includes(q));
  }, [colors, query]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8 text-center">
        <h1 className="bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-500 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
          URDF Color Palette
        </h1>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 sm:text-base">
          Browse {colors.length} named URDF materials. Click a swatch to copy
          its{" "}
          <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs dark:bg-gray-800">
            &lt;material&gt;
          </code>{" "}
          snippet.
        </p>
      </header>

      <div className="mb-6 flex items-center justify-center">
        <div className="relative w-full max-w-md">
          <MagnifyingGlassIcon
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search colors..."
            className="w-full rounded-full border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm transition focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-400/40 dark:border-gray-700 dark:bg-gray-900"
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
      </div>

      <p className="mb-4 text-center text-xs text-gray-500 dark:text-gray-400">
        Showing {filtered.length} of {colors.length}
      </p>

      <ColorGrid colors={filtered} onSelect={setSelected} />

      {selected && (
        <ColorModal color={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function ColorGrid({
  colors,
  onSelect,
}: {
  colors: UrdfColor[];
  onSelect: (c: UrdfColor) => void;
}) {
  if (colors.length === 0) {
    return (
      <p className="py-20 text-center text-gray-500 dark:text-gray-400">
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
    <div className="space-y-10">
      {GROUP_ORDER.filter((g) => byGroup.has(g)).map((group) => {
        const groupColors = byGroup.get(group)!;
        return (
          <section key={group}>
            <header className="mb-3 flex items-baseline justify-between border-b border-gray-200 pb-2 dark:border-gray-800">
              <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                {GROUP_LABELS[group]}
              </h2>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {groupColors.length}
              </span>
            </header>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
              {groupColors.map((color) => (
                <ColorTile
                  key={color.name}
                  color={color}
                  onSelect={onSelect}
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
  onSelect,
}: {
  color: UrdfColor;
  onSelect: (c: UrdfColor) => void;
}) {
  const light = isLight(color.rgba);
  return (
    <button
      type="button"
      onClick={() => onSelect(color)}
      title={color.name}
      className="group relative aspect-square overflow-hidden rounded-xl shadow-sm ring-1 ring-black/5 transition-all duration-200 ease-out hover:-translate-y-1 hover:scale-105 hover:shadow-xl hover:ring-2 hover:ring-violet-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:ring-white/10"
      style={{ backgroundColor: color.hex }}
    >
      <span className="absolute inset-0 bg-white/0 transition group-hover:bg-white/10" />
      <span
        className={`absolute inset-x-0 bottom-0 truncate px-2 py-1 text-[10px] font-medium opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${
          light ? "text-black/80" : "text-white/95"
        }`}
        style={{
          background: light
            ? "linear-gradient(to top, rgba(255,255,255,0.7), rgba(255,255,255,0))"
            : "linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0))",
        }}
      >
        {color.name}
      </span>
    </button>
  );
}

function ColorModal({
  color,
  onClose,
}: {
  color: UrdfColor;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(color.materialXml);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable in some contexts; fail silently.
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`URDF material: ${color.name}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      style={{ animation: "fadeIn 150ms ease-out" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 dark:bg-gray-900 dark:ring-white/10"
        style={{ animation: "modalIn 200ms ease-out" }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 rounded-full bg-white/80 p-1.5 text-gray-700 shadow-sm transition hover:bg-white dark:bg-gray-800/80 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>

        <div className="relative h-64 w-full bg-[#0b0d10]">
          <ColorPreview3D color={color.hex} />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-4 text-white">
            <h2 className="text-2xl font-bold drop-shadow">{color.name}</h2>
            <p className="mt-1 font-mono text-xs uppercase tracking-wider opacity-90">
              {color.hex}
            </p>
          </div>
        </div>

        <div className="p-5">
          <dl className="mb-4 grid grid-cols-4 gap-2 text-xs">
            {(["R", "G", "B", "A"] as const).map((label, i) => (
              <div
                key={label}
                className="rounded-lg bg-gray-50 p-2 text-center dark:bg-gray-800"
              >
                <dt className="font-semibold text-gray-500 dark:text-gray-400">
                  {label}
                </dt>
                <dd className="mt-1 font-mono text-gray-900 dark:text-gray-100">
                  {color.rgba[i].toFixed(3)}
                </dd>
              </div>
            ))}
          </dl>

          <div className="relative">
            <pre className="max-h-60 overflow-auto rounded-lg bg-gray-950 p-4 pr-12 text-xs leading-relaxed text-gray-100">
              <code>{color.materialXml}</code>
            </pre>
            <button
              type="button"
              onClick={copy}
              aria-label={copied ? "Copied" : "Copy URDF"}
              className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-white/10 px-2 py-1.5 text-xs font-medium text-white backdrop-blur transition hover:bg-white/20"
            >
              {copied ? (
                <>
                  <CheckIcon className="h-4 w-4 text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <ClipboardDocumentIcon className="h-4 w-4" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
