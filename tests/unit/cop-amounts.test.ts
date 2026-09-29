import { describe, expect, it } from "vitest";
import { extractCopAmounts, findOffCatalogPrices, parseSpanishNumber } from "@/lib/evals/cop-amounts";

const CATALOG = [
  { min: 8_000_000, max: 25_000_000 }, // simulacion-operaciones
  { min: 3_500_000, max: 12_000_000 }, // produccion-mas-limpia
  { min: 1_800_000, max: 6_000_000 }, // vigilancia-tecnologica-pi
];

describe("parseSpanishNumber", () => {
  it.each([
    ["8.000.000", 8_000_000],
    ["1,8", 1.8],
    ["2.5", 2.5],
    ["12", 12],
    ["25,000,000", 25_000_000],
  ])("%s -> %d", (raw, expected) => {
    expect(parseSpanishNumber(raw)).toBe(expected);
  });
});

describe("extractCopAmounts", () => {
  it("reads the invented range from the paso-03 hotel answer", () => {
    expect(extractCopAmounts("**Inversión aproximada:** entre **COP 6 y 12 millones**").ranges).toEqual([
      [6_000_000, 12_000_000],
    ]);
  });

  it("reads full-digit catalog ranges", () => {
    expect(extractCopAmounts("Entre COP 8.000.000 y COP 25.000.000.").ranges).toEqual([
      [8_000_000, 25_000_000],
    ]);
  });

  it("reads decimal millions and dashes", () => {
    expect(extractCopAmounts("cuesta 1,8–6 millones de pesos").ranges).toEqual([[1_800_000, 6_000_000]]);
  });

  it("reads single amounts", () => {
    expect(extractCopAmounts("un valor de $4.000.000 o 15 millones").singles).toEqual([
      4_000_000, 15_000_000,
    ]);
  });

  it("ignores durations, percentages and plain numbers", () => {
    const r = extractCopAmounts(
      "De 4 a 8 semanas, con 10 a 20 % de descuento para 24 habitaciones y 18 huéspedes.",
    );
    expect(r).toEqual({ ranges: [], singles: [] });
  });
});

describe("findOffCatalogPrices", () => {
  it("flags the invented hotel range", () => {
    expect(findOffCatalogPrices("entre COP 6 y 12 millones", CATALOG)).toHaveLength(1);
  });

  it("accepts the exact catalog range", () => {
    expect(findOffCatalogPrices("Inversión: entre COP 8.000.000 y COP 25.000.000", CATALOG)).toEqual([]);
  });

  it("accepts a range with the microenterprise discount (20 %) applied", () => {
    expect(findOffCatalogPrices("con el descuento quedaría entre 6,4 y 20 millones", CATALOG)).toEqual([]);
  });

  it("does not accept mixing endpoints from different services as a range", () => {
    // 3.5 M is the min of one service and 25 M the max of another
    expect(findOffCatalogPrices("entre 3,5 y 25 millones", CATALOG)).toHaveLength(1);
  });

  it("returns nothing when no prices are mentioned", () => {
    expect(findOffCatalogPrices("No puedo darte una cifra confiable.", CATALOG)).toEqual([]);
  });
});
