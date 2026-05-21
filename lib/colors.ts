import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import {
  GROUP_ORDER,
  type ColorGroup,
  type UrdfColor,
} from "./color-types";

export type { ColorGroup, UrdfColor } from "./color-types";
export { GROUP_ORDER, GROUP_LABELS } from "./color-types";

function rgbToHsl(
  r: number,
  g: number,
  b: number,
): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
  }
  return [h, s, l];
}

function classify(
  hsl: [number, number, number],
): ColorGroup {
  const [h, s, l] = hsl;
  if (s < 0.12 || l < 0.06 || l > 0.94) return "neutrals";
  if (h >= 12 && h < 50 && l < 0.5 && s < 0.85) return "browns";
  if (h < 15 || h >= 345) return "reds";
  if (h < 45) return "oranges";
  if (h < 65) return "yellows";
  if (h < 160) return "greens";
  if (h < 200) return "cyans";
  if (h < 250) return "blues";
  if (h < 290) return "purples";
  return "pinks";
}

const MATERIAL_RE =
  /<material\s+name="([^"]+)"\s*>\s*<color\s+rgba="([^"]+)"\s*\/>\s*<\/material>/g;

function toHex(component: number): string {
  const v = Math.max(0, Math.min(255, Math.round(component * 255)));
  return v.toString(16).padStart(2, "0");
}

function buildMaterialXml(name: string, rgbaString: string): string {
  return `<material name="${name}">\n  <color rgba="${rgbaString}"/>\n</material>`;
}

export const getColors = cache((): UrdfColor[] => {
  const filePath = path.join(process.cwd(), "data", "colors.xml");
  const xml = fs.readFileSync(filePath, "utf8");

  const colors: UrdfColor[] = [];
  for (const match of xml.matchAll(MATERIAL_RE)) {
    const [, name, rgbaRaw] = match;
    const parts = rgbaRaw.trim().split(/\s+/).map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) continue;
    const [r, g, b, a] = parts as [number, number, number, number];
    const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    const rgbaString = `${r} ${g} ${b} ${a}`;
    const hsl = rgbToHsl(r, g, b);
    colors.push({
      name,
      rgba: [r, g, b, a],
      hex,
      rgbaString,
      materialXml: buildMaterialXml(name, rgbaString),
      group: classify(hsl),
      hsl,
    });
  }

  // Sort: by group order, then by hue, then by lightness — yields a nice gradient inside each group.
  const groupRank = new Map(GROUP_ORDER.map((g, i) => [g, i]));
  colors.sort((a, b) => {
    const gr = (groupRank.get(a.group) ?? 99) - (groupRank.get(b.group) ?? 99);
    if (gr !== 0) return gr;
    if (a.group === "neutrals") return a.hsl[2] - b.hsl[2];
    const hueDiff = a.hsl[0] - b.hsl[0];
    if (Math.abs(hueDiff) > 1) return hueDiff;
    return a.hsl[2] - b.hsl[2];
  });
  return colors;
});
