import type { PixelCode } from "@/components/pet/sprites";

/**
 * The pen's colours. UI chrome stays on the design tokens; the illustrated farm gets its own
 * muted, dark-friendly palette, and Purl keeps the token colours used by its CSS sprite so
 * the lamb looks identical everywhere on the site.
 */

export const PURL_FILL: Record<PixelCode, string> = {
  W: "#f2f3f5",
  w: "#a7abb5",
  F: "#6b7280",
  E: "#111318",
  h: "#f2f3f5",
  B: "#d9ff72",
  S: "#d9ff72",
  L: "#a7abb5",
};

export const FARM = {
  grass: ["#2b4633", "#304d38", "#27422f", "#35533c"],
  grassEdge: "#1b2e21",
  tuft: "#466b47",
  tuftDark: "#223c2a",
  clover: "#86a864",
  flower: "#d8d7bd",
  path: ["#5a4f40", "#615545", "#534839"],
  pathEdge: "#453b2e",
  pebble: "#7c6e59",
  soil: ["#3a3027", "#41362b", "#342b23"],
  cropRow: "#4e3f2e",
  sprout: "#7c9a57",
  sproutDark: "#5c7a42",
  water: "#294c57",
  waterDeep: "#1d3943",
  waterLight: "#4d7883",
  foam: "#8db1b3",
  earth: "#2b241c",
  earthLight: "#3a3025",
  earthDark: "#1e1914",
  wood: "#6a5843",
  woodDark: "#4a3c2d",
  woodLight: "#8d7658",
  woodWorn: "#7c684f",
  barnWall: "#5b3730",
  barnDark: "#40261f",
  barnLight: "#74473c",
  barnTrim: "#94795b",
  barnRoof: "#33292b",
  barnRoofLight: "#4b3d3f",
  window: "#f0b95b",
  hay: "#8c7440",
  hayDark: "#6b5730",
  hayLight: "#ab8d51",
  cream: "#e6ddca",
  leafDark: "#1e382b",
  leaf: "#2b4a36",
  leafLight: "#3f6347",
  leafSun: "#527a52",
  stone: "#565b5d",
  stoneDark: "#3c4143",
  stoneLight: "#6c7274",
  red: "#b4574a",
  lamp: "#ffcf7a",
  ink: "#111318",
  ash: "#0a0c10",
} as const;

export interface PeerStyle {
  shirt: string;
  shirtDark: string;
  pants: string;
  hair: string;
  skin: string;
  accent: string;
}

/** Six developers, so everyone on the farm is easy to tell apart. */
export const PEER_STYLES: readonly [PeerStyle, ...PeerStyle[]] = [
  { shirt: "#8ab8f0", shirtDark: "#5a86b8", pants: "#2b303a", hair: "#23242b", skin: "#f0c9a4", accent: "#d9ff72" },
  { shirt: "#7bd49a", shirtDark: "#4f9a6b", pants: "#263029", hair: "#5a3b26", skin: "#d9a97f", accent: "#d9ff72" },
  { shirt: "#f0b95b", shirtDark: "#b5863a", pants: "#332c25", hair: "#c9b28a", skin: "#f0c9a4", accent: "#d9ff72" },
  { shirt: "#ff8a80", shirtDark: "#bd5a52", pants: "#2e2528", hair: "#2d3a4a", skin: "#8a5a3c", accent: "#d9ff72" },
  { shirt: "#c3a6f0", shirtDark: "#8c72b8", pants: "#2a2833", hair: "#15161c", skin: "#b57f57", accent: "#d9ff72" },
  { shirt: "#d9ff72", shirtDark: "#a3bf4f", pants: "#2b2f27", hair: "#6b4a2c", skin: "#f0c9a4", accent: "#111318" },
];

export function peerStyle(color: number): PeerStyle {
  return PEER_STYLES[Math.abs(Math.round(color)) % PEER_STYLES.length] ?? PEER_STYLES[0];
}

export const FIREFLY = "#d9ff72";
export const STAR = "#dfe6d8";
export const RAIN = "#9fb6bf";
