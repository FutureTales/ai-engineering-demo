/**
 * Extract Colombian peso amounts from free text and check them against the
 * catalog. Used by the deterministic "no off-catalog prices" eval.
 *
 * Handles: "COP 8.000.000", "$8.000.000", "8 millones", "COP 1,8 millones",
 * "entre 6 y 12 millones", "COP 8.000.000 – 25.000.000", "4–7 millones de pesos".
 */

export interface CopAmounts {
  ranges: [number, number][];
  singles: number[];
}

const NUM = String.raw`\d+(?:[.,]\d+)*`;
const UNIT = String.raw`(?:millones|millón|mill\.?|M)\b`;
const CUR = String.raw`(?:COP\s*\$?|\$)`;

const RANGE_RE = new RegExp(
  String.raw`(${CUR})?\s*(${NUM})\s*(${UNIT})?\s*(?:y|a|–|—|-|hasta)\s*(${CUR})?\s*(${NUM})\s*(${UNIT})?(\s*(?:de\s+pesos|COP|pesos))?`,
  "gi",
);
const SINGLE_RE = new RegExp(
  String.raw`(${CUR})\s*(${NUM})\s*(${UNIT})?|(${NUM})\s*(${UNIT})(\s*(?:de\s+pesos|COP|pesos))?`,
  "gi",
);

/** "8.000.000" -> 8000000; "1,8" -> 1.8; "2.5" -> 2.5; "12" -> 12. */
export function parseSpanishNumber(raw: string): number {
  if (/^\d{1,3}(\.\d{3})+$/.test(raw)) return Number(raw.replaceAll(".", ""));
  if (/^\d{1,3}(,\d{3})+$/.test(raw)) return Number(raw.replaceAll(",", ""));
  return Number(raw.replace(",", "."));
}

function toCop(value: number, hasMillionUnit: boolean): number {
  return Math.round(hasMillionUnit ? value * 1_000_000 : value);
}

export function extractCopAmounts(text: string): CopAmounts {
  const ranges: [number, number][] = [];
  const consumed: [number, number][] = [];

  for (const m of text.matchAll(RANGE_RE)) {
    const [full, cur1, n1, unit1, cur2, n2, unit2, pesos] = m;
    const isMoney = Boolean(cur1 || cur2 || unit1 || unit2 || pesos);
    if (!isMoney) continue;
    // Skip percentages ("10 a 20 %") and durations ("4 a 8 semanas").
    const after = text.slice((m.index ?? 0) + full.length, (m.index ?? 0) + full.length + 12);
    if (/^\s*(%|por ciento|semanas|meses|días|horas|min)/i.test(after)) continue;
    const million = Boolean(unit1 || unit2);
    const a = toCop(parseSpanishNumber(n1), million && (Boolean(unit1) || parseSpanishNumber(n1) < 1000));
    const b = toCop(parseSpanishNumber(n2), Boolean(unit2) || (million && parseSpanishNumber(n2) < 1000));
    if (a < 100_000 || b < 100_000) continue; // not plausible service prices
    ranges.push([Math.min(a, b), Math.max(a, b)]);
    consumed.push([m.index ?? 0, (m.index ?? 0) + full.length]);
  }

  const singles: number[] = [];
  for (const m of text.matchAll(SINGLE_RE)) {
    const start = m.index ?? 0;
    if (consumed.some(([s, e]) => start >= s && start < e)) continue;
    const [, cur, n1, unit1, n2, unit2] = m;
    const raw = n1 ?? n2;
    const million = Boolean(unit1 || unit2);
    if (!cur && !million) continue;
    const value = toCop(parseSpanishNumber(raw), million);
    if (value < 100_000) continue;
    singles.push(value);
  }
  return { ranges, singles };
}

export interface PriceBounds {
  min: number;
  max: number;
}

const DISCOUNTS = [0, 0.1, 0.15, 0.2]; // tarifas-descuentos.md

function nearlyEqual(a: number, b: number) {
  return Math.abs(a - b) <= 1000;
}

/**
 * A range is valid only if it equals some service's catalog range (optionally
 * with one of the policy discounts applied to both ends). A single amount is
 * valid if it equals any catalog endpoint (again, optionally discounted).
 */
export function findOffCatalogPrices(text: string, catalog: PriceBounds[]): string[] {
  const { ranges, singles } = extractCopAmounts(text);
  const offending: string[] = [];
  const fmt = (n: number) => `COP ${n.toLocaleString("es-CO")}`;

  for (const [a, b] of ranges) {
    const ok = catalog.some((p) =>
      DISCOUNTS.some((d) => nearlyEqual(a, p.min * (1 - d)) && nearlyEqual(b, p.max * (1 - d))),
    );
    if (!ok) offending.push(`${fmt(a)} – ${fmt(b)}`);
  }
  const endpoints = catalog.flatMap((p) => [p.min, p.max]);
  for (const v of singles) {
    const ok = endpoints.some((e) => DISCOUNTS.some((d) => nearlyEqual(v, e * (1 - d))));
    if (!ok) offending.push(fmt(v));
  }
  return offending;
}
