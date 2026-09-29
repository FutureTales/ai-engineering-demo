import { describe, expect, it } from "vitest";
import { totalVariation } from "@/lib/telemetry/health";

describe("totalVariation (drift metric)", () => {
  it("is 0 for identical distributions", () => {
    expect(totalVariation({ a: 0.5, b: 0.5 }, { a: 0.5, b: 0.5 })).toBe(0);
  });
  it("is 1 for disjoint distributions", () => {
    expect(totalVariation({ a: 1 }, { b: 1 })).toBe(1);
  });
  it("measures the IP-avalanche shift of the demo", () => {
    const baseline = { quality_assurance: 0.3, business_innovation: 0.3, process_design: 0.4 };
    const drift = { quality_assurance: 0.15, business_innovation: 0.65, process_design: 0.2 };
    expect(totalVariation(baseline, drift)).toBeCloseTo(0.35, 10);
  });
});
