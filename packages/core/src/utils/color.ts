/**
 * Color value classification and conversion helpers.
 *
 * DESIGN.md requires colors as `#RRGGBB` sRGB hex. We try to convert
 * common CSS forms (hex shorthand, hsl, naked HSL triplet) into spec-compliant
 * hex; values we cannot safely convert (oklch, color(), CSS variables)
 * are returned unchanged so the lint can flag them.
 */

const COLOR_FN_PATTERN = /^(rgb|rgba|hsl|hsla|oklch|oklab|color|lab|lch|hwb)\s*\(/i;
const NAKED_HSL_PATTERN = /^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/;
const HSL_FN_PATTERN = /^hsla?\(\s*([\d.]+)(?:deg)?\s*[\s,]\s*([\d.]+)%\s*[\s,]\s*([\d.]+)%/;
const RGB_FN_PATTERN = /^rgba?\(\s*([\d.]+)\s*[\s,]\s*([\d.]+)\s*[\s,]\s*([\d.]+)/;
const HEX_PATTERN = /^#[0-9a-f]{3,8}$/i;

const NAMED_COLORS = new Set([
  'transparent', 'currentcolor', 'inherit',
  'black', 'white', 'red', 'green', 'blue', 'yellow', 'orange', 'purple',
  'gray', 'grey', 'silver', 'maroon', 'olive', 'lime', 'aqua', 'teal',
  'navy', 'fuchsia', 'pink', 'brown', 'cyan', 'magenta',
]);

export function isColorValue(value: string): boolean {
  const v = value.trim();
  if (HEX_PATTERN.test(v)) return true;
  if (COLOR_FN_PATTERN.test(v)) return true;
  if (NAKED_HSL_PATTERN.test(v)) return true;
  if (NAMED_COLORS.has(v.toLowerCase())) return true;
  return false;
}

export function isDimensionValue(value: string): boolean {
  const v = value.trim();
  return /^-?[\d.]+(?:px|rem|em|%|vh|vw|ch|ex)?$/.test(v);
}

/**
 * Best-effort conversion to `#RRGGBB`. Returns `undefined` when the value
 * cannot be safely converted in sRGB space (oklch, lab, var(), etc.).
 */
export function toHex(value: string): string | undefined {
  const v = value.trim();
  if (HEX_PATTERN.test(v)) return normaliseHex(v);

  const naked = NAKED_HSL_PATTERN.exec(v);
  if (naked?.[1] !== undefined) return hslToHex(+naked[1], +naked[2]!, +naked[3]!);

  const hsl = HSL_FN_PATTERN.exec(v);
  if (hsl?.[1] !== undefined) return hslToHex(+hsl[1], +hsl[2]!, +hsl[3]!);

  const rgb = RGB_FN_PATTERN.exec(v);
  if (rgb?.[1] !== undefined) return rgbToHex(+rgb[1], +rgb[2]!, +rgb[3]!);

  return undefined;
}

function normaliseHex(hex: string): string {
  if (hex.length === 4) {
    return `#${hex[1]!}${hex[1]!}${hex[2]!}${hex[2]!}${hex[3]!}${hex[3]!}`.toUpperCase();
  }
  return hex.length >= 7 ? `#${hex.slice(1, 7).toUpperCase()}` : hex.toUpperCase();
}

function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const k = (n: number): number => (n + h / 30) % 12;
  const a = sNorm * Math.min(lNorm, 1 - lNorm);
  const f = (n: number): number => lNorm - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return rgbToHex(
    Math.round(255 * f(0)),
    Math.round(255 * f(8)),
    Math.round(255 * f(4)),
  );
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number): number => Math.max(0, Math.min(255, Math.round(n)));
  const hex = (n: number): string => clamp(n).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`.toUpperCase();
}
