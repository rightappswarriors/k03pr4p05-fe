/**
 * Appends a hex alpha suffix to a hex color, e.g. withAlpha('#2563EB', '18') -> '#2563EB18'.
 * Matches the pattern already used by StatCard (backgroundColor: withAlpha(accent, '18')).
 * If your project already has this helper elsewhere (e.g. utils/colorUtils), prefer that
 * import instead — this is a drop-in fallback so the verification components aren't blocked.
 */
export function withAlpha(hexColor: string, alphaHex: string): string {
  return `${hexColor}${alphaHex}`
}