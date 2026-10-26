/**
 * Normalize add-to-cart variant input.
 * For color_pair_pack, accepts `pairColor` (one) and/or `pairColors` (one or more).
 * Expands to one `{ color, pairColor }` record per second color.
 */
export function expandCartVariants(
  raw: Record<string, unknown> | null | undefined,
): Array<Record<string, string> | null> {
  if (raw === undefined || raw === null) {
    return [null];
  }

  const base: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key === 'pairColor' || key === 'pairColors') continue;
    if (typeof value === 'string') {
      base[key] = value;
    }
  }

  const fromArray = Array.isArray(raw.pairColors)
    ? raw.pairColors
        .filter((v): v is string => typeof v === 'string')
        .map((v) => v.trim())
        .filter(Boolean)
    : [];

  const fromSingle =
    typeof raw.pairColor === 'string' && raw.pairColor.trim()
      ? [raw.pairColor.trim()]
      : [];

  const pairColors = [...new Set([...fromArray, ...fromSingle])];

  if (pairColors.length === 0) {
    return [Object.keys(base).length > 0 ? base : null];
  }

  return pairColors.map((pairColor) => ({ ...base, pairColor }));
}
