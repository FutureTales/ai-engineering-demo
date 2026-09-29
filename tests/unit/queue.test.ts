import { describe, expect, it } from "vitest";
import { analyticMMc, erlangC, mulberry32, simulateDES, simulateQueue } from "@/lib/tools/queue";

describe("erlangC", () => {
  it("matches the hand-computed hotel case (a = 1.8 Erlangs, c = 2)", () => {
    // P0 = 1 / (1 + 1.8 + 1.62 / 0.1) = 1/19 ; Pw = 16.2 / 19
    expect(erlangC(2, 1.8)).toBeCloseTo(16.2 / 19, 10);
  });

  it("reduces to rho for a single server (M/M/1)", () => {
    expect(erlangC(1, 0.7)).toBeCloseTo(0.7, 10);
  });

  it("returns 1 when the system is unstable", () => {
    expect(erlangC(2, 2)).toBe(1);
    expect(erlangC(2, 3)).toBe(1);
  });

  it("decreases as servers are added", () => {
    const values = [2, 3, 4, 5].map((c) => erlangC(c, 1.8));
    for (let i = 1; i < values.length; i++) expect(values[i]).toBeLessThan(values[i - 1]);
  });
});

describe("analyticMMc", () => {
  it("hotel with 2 receptionists: average wait ≈ 25.6 min", () => {
    // Wq = Pw / (c*mu - lambda) = (16.2/19) / (20 - 18) h = 0.4263 h
    const r = analyticMMc(18, 6, 2)!;
    expect(r.avg_wait_min).toBe(25.6);
    expect(r.prob_wait).toBe(0.853);
    expect(r.avg_time_in_system_min).toBe(31.6);
  });

  it("M/M/1 closed form: Wq = rho / (mu - lambda)", () => {
    // lambda = 6/h, service 6 min -> mu = 10/h, rho = 0.6, Wq = 0.6/4 h = 9 min
    expect(analyticMMc(6, 6, 1)!.avg_wait_min).toBe(9);
  });

  it("p90 is 0 when fewer than 10% of customers wait", () => {
    expect(analyticMMc(18, 3, 4)!.p90_wait_min).toBe(0);
  });

  it("is null when unstable", () => {
    expect(analyticMMc(20, 6, 2)).toBeNull();
    expect(analyticMMc(30, 6, 2)).toBeNull();
  });
});

describe("simulateDES", () => {
  it("is deterministic for a fixed seed", () => {
    expect(simulateDES(18, 6, 2, 3)).toEqual(simulateDES(18, 6, 2, 3));
  });

  it("changes with a different seed", () => {
    expect(simulateDES(18, 6, 2, 3, { seed: 1 })).not.toEqual(simulateDES(18, 6, 2, 3, { seed: 2 }));
  });

  it("converges to Erlang C over a long horizon (M/M/c steady state)", () => {
    const sim = simulateDES(18, 6, 3, 2000, { replications: 1 });
    const exact = analyticMMc(18, 6, 3)!;
    expect(Math.abs(sim.avg_wait_min - exact.avg_wait_min)).toBeLessThan(
      Math.max(0.3, exact.avg_wait_min * 0.15),
    );
  });

  it("gives shorter waits in a 3-hour window than steady state when rho is high (queue starts empty)", () => {
    const window = simulateDES(18, 6, 2, 3);
    expect(window.avg_wait_min).toBeLessThan(analyticMMc(18, 6, 2)!.avg_wait_min);
    expect(window.avg_wait_min).toBeGreaterThan(5);
  });

  it("mulberry32 produces values in [0, 1)", () => {
    const r = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const x = r();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});

describe("simulateQueue (tool entry point)", () => {
  const hotel = simulateQueue([
    {
      scenario_label: "Actual: 2 recepcionistas",
      arrival_rate_per_hour: 18,
      service_time_min: 6,
      servers: 2,
    },
    { scenario_label: "3 recepcionistas", arrival_rate_per_hour: 18, service_time_min: 6, servers: 3 },
    { scenario_label: "4 recepcionistas", arrival_rate_per_hour: 18, service_time_min: 6, servers: 4 },
    {
      scenario_label: "Check-in digital (3 min), 2 recepcionistas",
      arrival_rate_per_hour: 18,
      service_time_min: 3,
      servers: 2,
    },
    { scenario_label: "Pico de 22 llegadas/h", arrival_rate_per_hour: 22, service_time_min: 6, servers: 2 },
  ]);

  it("handles several scenarios in one call", () => {
    expect(hotel).toHaveLength(5);
    expect(hotel.map((s) => s.utilization)).toEqual([0.9, 0.6, 0.45, 0.45, 1.1]);
  });

  it("more receptionists means less waiting", () => {
    expect(hotel[1].analytic!.avg_wait_min).toBeLessThan(hotel[0].analytic!.avg_wait_min);
    expect(hotel[2].analytic!.avg_wait_min).toBeLessThan(hotel[1].analytic!.avg_wait_min);
  });

  it("flags rho >= 1 as unstable, with no analytic result but a finite simulation", () => {
    expect(hotel[4].stable).toBe(false);
    expect(hotel[4].analytic).toBeNull();
    expect(hotel[4].verdict).toMatch(/Inestable/);
    expect(Number.isFinite(hotel[4].simulation.avg_wait_min)).toBe(true);
  });

  it("digital check-in with 2 receptionists equals 4 receptionists in utilization", () => {
    expect(hotel[3].utilization).toBe(hotel[2].utilization);
  });
});
