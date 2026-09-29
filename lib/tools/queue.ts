/**
 * Queue simulation for "what if" scenarios (the copilot's `simulate_queue` tool).
 *
 * Two complementary methods, both deterministic:
 * 1. Analytic Erlang C (M/M/c, steady state): exact formulas, valid only when
 *    utilization rho < 1. Assumes Poisson arrivals and exponential service times.
 * 2. Discrete-event simulation of a finite peak window (e.g. 2–5 p.m.) starting
 *    with an empty queue, with a fixed seed. Works even when rho >= 1 (the queue
 *    just keeps growing during the window) and shows what a real afternoon looks like.
 *
 * The LLM never computes these numbers: it only chooses the inputs.
 */

export interface QueueScenarioInput {
  scenario_label: string;
  arrival_rate_per_hour: number;
  service_time_min: number;
  servers: number;
  /** Length of the peak window to simulate, in hours. */
  hours?: number;
}

export interface AnalyticResult {
  prob_wait: number;
  avg_wait_min: number;
  p90_wait_min: number;
  avg_queue_len: number;
  avg_time_in_system_min: number;
}

export interface SimulationResult {
  hours: number;
  replications: number;
  seed: number;
  avg_wait_min: number;
  p90_wait_min: number;
  avg_queue_len: number;
  /** Longest queue on a typical day (median over replications of each day's maximum). */
  typical_max_queue_len: number;
  /** Longest queue on a bad day (90th percentile of each day's maximum). */
  bad_day_max_queue_len: number;
  customers_per_replication: number;
}

export interface QueueScenarioResult {
  scenario_label: string;
  servers: number;
  arrival_rate_per_hour: number;
  service_time_min: number;
  utilization: number;
  stable: boolean;
  verdict: string;
  analytic: AnalyticResult | null;
  simulation: SimulationResult;
}

const round = (x: number, d = 1) => Math.round(x * 10 ** d) / 10 ** d;

// ---------------------------------------------------------------------------
// Erlang C
// ---------------------------------------------------------------------------

/** Probability that an arriving customer has to wait (Erlang C formula). */
export function erlangC(servers: number, offeredLoad: number): number {
  const rho = offeredLoad / servers;
  if (rho >= 1) return 1;
  // Sum_{k=0}^{c-1} a^k / k!, computed iteratively for numerical stability.
  let term = 1;
  let sum = 1;
  for (let k = 1; k < servers; k++) {
    term *= offeredLoad / k;
    sum += term;
  }
  const last = (term * offeredLoad) / servers; // a^c / c!
  const top = last / (1 - rho);
  return top / (sum + top);
}

export function analyticMMc(
  lambdaPerHour: number,
  serviceTimeMin: number,
  servers: number,
): AnalyticResult | null {
  const mu = 60 / serviceTimeMin; // customers per hour per server
  const a = lambdaPerHour / mu;
  const rho = a / servers;
  if (rho >= 1) return null;
  const pw = erlangC(servers, a);
  const drainRate = servers * mu - lambdaPerHour; // per hour
  const wqHours = pw / drainRate;
  // P(Wq > t) = Pw * exp(-drainRate * t)  =>  p90 = ln(Pw / 0.1) / drainRate (0 if Pw <= 0.1)
  const p90Hours = pw <= 0.1 ? 0 : Math.log(pw / 0.1) / drainRate;
  return {
    prob_wait: round(pw, 3),
    avg_wait_min: round(wqHours * 60),
    p90_wait_min: round(p90Hours * 60),
    avg_queue_len: round(lambdaPerHour * wqHours, 2),
    avg_time_in_system_min: round(wqHours * 60 + serviceTimeMin),
  };
}

// ---------------------------------------------------------------------------
// Discrete-event simulation
// ---------------------------------------------------------------------------

/** Small, fast, seedable PRNG (mulberry32). */
export function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const exponential = (rand: () => number, mean: number) => -Math.log(1 - rand()) * mean;

interface Replication {
  waits: number[];
  queueArea: number;
  maxQueue: number;
  duration: number;
}

/**
 * FCFS multi-server queue. Customers arrive during `hours`; everyone who
 * arrived is served (the window closes to new arrivals, not to service).
 * Times in minutes.
 */
function simulateOnce(
  lambdaPerHour: number,
  serviceTimeMin: number,
  servers: number,
  hours: number,
  rand: () => number,
): Replication {
  const windowMin = hours * 60;
  const meanInterarrival = 60 / lambdaPerHour;
  const arrivals: number[] = [];
  for (let t = exponential(rand, meanInterarrival); t < windowMin; t += exponential(rand, meanInterarrival)) {
    arrivals.push(t);
  }
  const freeAt = new Array<number>(servers).fill(0);
  const waits: number[] = [];
  const events: { t: number; delta: number }[] = []; // +1 joins queue, -1 leaves queue
  for (const arrival of arrivals) {
    let k = 0;
    for (let i = 1; i < servers; i++) if (freeAt[i] < freeAt[k]) k = i;
    const start = Math.max(arrival, freeAt[k]);
    freeAt[k] = start + exponential(rand, serviceTimeMin);
    waits.push(start - arrival);
    if (start > arrival) {
      events.push({ t: arrival, delta: +1 }, { t: start, delta: -1 });
    }
  }
  events.sort((x, y) => x.t - y.t || x.delta - y.delta);
  let q = 0;
  let last = 0;
  let area = 0;
  let maxQueue = 0;
  for (const e of events) {
    area += q * (e.t - last);
    q += e.delta;
    last = e.t;
    maxQueue = Math.max(maxQueue, q);
  }
  return { waits, queueArea: area, maxQueue, duration: Math.max(windowMin, ...freeAt) };
}

const percentile = (xs: number[], p: number) => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
};

/** Total simulated customers across all replications is kept around this budget. */
const CUSTOMER_BUDGET = 300_000;

export function simulateDES(
  lambdaPerHour: number,
  serviceTimeMin: number,
  servers: number,
  hours: number,
  { replications: requested, seed = 42 }: { replications?: number; seed?: number } = {},
): SimulationResult {
  // Adaptive replications: 200 for small cases (e.g. the hotel: ~54 customers per afternoon),
  // fewer for huge ones, so the cost of one call is bounded.
  const replications =
    requested ??
    Math.max(20, Math.min(200, Math.floor(CUSTOMER_BUDGET / Math.max(1, lambdaPerHour * hours))));
  const rand = mulberry32(seed);
  const allWaits: number[] = [];
  let queueAreaSum = 0;
  let durationSum = 0;
  const dailyMax: number[] = [];
  let customers = 0;
  for (let r = 0; r < replications; r++) {
    const rep = simulateOnce(lambdaPerHour, serviceTimeMin, servers, hours, rand);
    for (const w of rep.waits) allWaits.push(w); // no spread: avoids call-stack limits on big arrays
    queueAreaSum += rep.queueArea;
    durationSum += rep.duration;
    dailyMax.push(rep.maxQueue);
    customers += rep.waits.length;
  }
  const mean = allWaits.reduce((a, b) => a + b, 0) / Math.max(1, allWaits.length);
  return {
    hours,
    replications,
    seed,
    avg_wait_min: round(mean),
    p90_wait_min: round(percentile(allWaits, 0.9)),
    avg_queue_len: round(queueAreaSum / durationSum, 2),
    typical_max_queue_len: percentile(dailyMax, 0.5),
    bad_day_max_queue_len: percentile(dailyMax, 0.9),
    customers_per_replication: round(customers / replications),
  };
}

// ---------------------------------------------------------------------------
// Tool entry point
// ---------------------------------------------------------------------------

export function simulateQueue(scenarios: QueueScenarioInput[]): QueueScenarioResult[] {
  return scenarios.map((s) => {
    const hours = s.hours ?? 3;
    const mu = 60 / s.service_time_min;
    const utilization = s.arrival_rate_per_hour / (s.servers * mu);
    const stable = utilization < 1;
    const analytic = analyticMMc(s.arrival_rate_per_hour, s.service_time_min, s.servers);
    const simulation = simulateDES(s.arrival_rate_per_hour, s.service_time_min, s.servers, hours);
    const verdict = !stable
      ? "Inestable: llegan más clientes de los que se pueden atender (utilización ≥ 100 %). La fila crece sin límite mientras dure el pico."
      : utilization >= 0.85
        ? "Estable pero al límite: con esta utilización, cualquier variación produce filas largas."
        : utilization >= 0.7
          ? "Estable, con filas moderadas en los momentos de más llegadas."
          : "Estable y con holgura: la espera es baja.";
    return {
      scenario_label: s.scenario_label,
      servers: s.servers,
      arrival_rate_per_hour: s.arrival_rate_per_hour,
      service_time_min: s.service_time_min,
      utilization: round(utilization, 3),
      stable,
      verdict,
      analytic,
      simulation,
    };
  });
}
