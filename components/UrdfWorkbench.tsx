"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import ColorPalette from "./ColorPalette";
import ColorModal from "./ColorModal";
import type { UrdfColor } from "@/lib/color-types";

const UrdfViewer = dynamic(() => import("./UrdfViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center rounded-2xl border border-gray-200 bg-[#0b0d10] text-sm text-gray-400 dark:border-gray-800">
      Loading viewer…
    </div>
  ),
});

type Props = {
  colors: UrdfColor[];
};

export default function UrdfWorkbench({ colors }: Props) {
  const [selectedLink, setSelectedLink] = useState<string | null>(null);
  const [linkColors, setLinkColors] = useState<Record<string, string>>({});
  const [inspectColor, setInspectColor] = useState<UrdfColor | null>(null);

  const applyColor = useCallback(
    (color: UrdfColor) => {
      if (!selectedLink) return;
      setLinkColors((prev) => ({ ...prev, [selectedLink]: color.hex }));
    },
    [selectedLink],
  );

  const handleLinksLoaded = useCallback(() => {
    setLinkColors({});
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-gray-950">
      <aside className="flex h-full w-[340px] shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        <ColorPalette
          colors={colors}
          selectedLinkName={selectedLink}
          onApplyColor={applyColor}
          onInspectColor={setInspectColor}
        />
      </aside>
      <section className="h-full flex-1 p-4">
        <UrdfViewer
          linkColors={linkColors}
          selectedLink={selectedLink}
          onSelectLink={setSelectedLink}
          onLinksLoaded={handleLinksLoaded}
        />
      </section>

      {inspectColor && (
        <ColorModal
          color={inspectColor}
          onClose={() => setInspectColor(null)}
          onApply={selectedLink ? applyColor : undefined}
        />
      )}
    </div>
  );
}
