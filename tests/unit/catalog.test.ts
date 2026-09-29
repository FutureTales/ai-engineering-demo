import { describe, expect, it } from "vitest";
import { LINES, loadPolicies, loadServices } from "@/lib/catalog/load";

describe("catalog", () => {
  const services = loadServices();

  it("has between 8 and 10 services and 3 policies", () => {
    expect(services.length).toBeGreaterThanOrEqual(8);
    expect(services.length).toBeLessThanOrEqual(10);
    expect(loadPolicies()).toHaveLength(3);
  });

  it("covers every work line", () => {
    for (const line of LINES) {
      expect(services.some((s) => s.line === line)).toBe(true);
    }
  });

  it("has valid COP price ranges", () => {
    for (const s of services) {
      expect(s.priceMinCop).toBeGreaterThan(0);
      expect(s.priceMaxCop).toBeGreaterThanOrEqual(s.priceMinCop);
    }
  });

  it("extracts a non-empty summary and required sections for every service", () => {
    for (const s of services) {
      expect(s.summary.length, s.id).toBeGreaterThan(40);
      for (const section of ["## Cuándo aplica", "## Entregables", "## Inversión", "## Ejemplos"]) {
        expect(s.content, `${s.id} is missing ${section}`).toContain(section);
      }
    }
  });

  it("includes the operations simulation service used in the hotel demo", () => {
    const sim = services.find((s) => s.id === "simulacion-operaciones");
    expect(sim?.line).toBe("process_design");
  });
});
