"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  CheckIcon,
  ClipboardDocumentIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type { UrdfColor } from "@/lib/color-types";

const ColorPreview3D = dynamic(() => import("./ColorPreview3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#0b0d10] text-xs text-gray-400">
      Loading 3D preview…
    </div>
  ),
});

type Props = {
  color: UrdfColor;
  onClose: () => void;
  onApply?: (color: UrdfColor) => void;
  applyLabel?: string;
};

export default function ColorModal({ color, onClose, onApply, applyLabel }: Props) {
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

          {onApply && (
            <button
              type="button"
              onClick={() => {
                onApply(color);
                onClose();
              }}
              className="mt-4 w-full rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-violet-500"
            >
              {applyLabel ?? "Apply to selected link"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}