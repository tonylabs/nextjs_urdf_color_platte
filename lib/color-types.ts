export type ColorGroup =
  | "reds"
  | "oranges"
  | "browns"
  | "yellows"
  | "greens"
  | "cyans"
  | "blues"
  | "purples"
  | "pinks"
  | "neutrals";

export const GROUP_ORDER: ColorGroup[] = [
  "reds",
  "oranges",
  "browns",
  "yellows",
  "greens",
  "cyans",
  "blues",
  "purples",
  "pinks",
  "neutrals",
];

export const GROUP_LABELS: Record<ColorGroup, string> = {
  reds: "Reds",
  oranges: "Oranges",
  browns: "Browns",
  yellows: "Yellows",
  greens: "Greens",
  cyans: "Cyans & Teals",
  blues: "Blues",
  purples: "Purples",
  pinks: "Pinks & Magentas",
  neutrals: "Neutrals",
};

export type UrdfColor = {
  name: string;
  rgba: [number, number, number, number];
  hex: string;
  rgbaString: string;
  materialXml: string;
  group: ColorGroup;
  hsl: [number, number, number];
};
