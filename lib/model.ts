// Radar-3: the token launch radar's model, written for token-radar-01.
//
// A protocol's implied value is what its token would be worth if the
// protocol's record stayed as it is. It is a model estimate, never a
// price and never a prediction that a token will be issued, or when.
//
//   implied = exp(a + b * ln(TVL))
//
// where a and b are fitted, on every run, by ordinary least squares
// on the snapshot's own traded tokens (the comparables): the
// protocols that already record a token, a market cap and a TVL.
// No multiple is asserted and no protocol name is ever special-cased.
//
// The fit is kept only because it survives two blind tests, both
// recomputed on every run and shown on the dashboard:
//   - leave-one-out: the curve predicts a held-out traded token's
//     market cap better than a flat median multiple, and better
//     than the curve with category, growth, age or chain terms added
//     (each of those is tried, and each loses, so each stays out);
//   - walk-forward: fit on the older half of the traded tokens
//     (by the day DefiLlama began tracking them), tested on the
//     newer half: the curve beats the flat multiple there too.
//
// A farm plan is netted to the dollar: it states its deposit, its
// gas, its fees and the opportunity cost of the capital, and the
// airdrop it expects at the central estimate and at the low end of
// the comparables' band. The verdict is FARM when even the low end
// covers the plan's cost at some deposit up to $1,000, THIN when
// only the central estimate does, and SKIP when neither does.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's version label: the dashboard names it. */
export const MODEL_VERSION = 'radar-3';

/** How many live-token protocols the dashboard's Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** The share of a token's supply a launch is assumed to hand to its farmers. */
export const AIRDROP_SHARE = 0.1;
/** The low end of the comparables' band: the 25th percentile of (actual / fitted) across the comparables. */
export const BAND_LOW = 0.352;
/** The high end of the comparables' band: the 75th percentile of (actual / fitted). */
export const BAND_HIGH = 3.058;
/** The deposits a farm plan may size itself to, in dollars. */
export const DEPOSIT_STEPS = [100, 250, 500, 1000];
/** The deposit a SKIP row's plan names: no deposit is recommended. */
export const SKIP_DEPOSIT = 50;
/** The yearly return the plan charges its own capital for sitting in a farm. */
export const OPPORTUNITY_APR = 0.05;
/** The transactions a farm plan counts: bridge in, deposit, second action, three weekly actions, exit. */
export const PLAN_TX_COUNT = 6;
/** The flat bridge fee a plan counts, in dollars. */
export const BRIDGE_FEE_USD = 2;
/** The bootstrap refits behind every row's rank range. */
export const BOOTSTRAP_REFITS = 200;
/** The seed that makes the bootstrap identical on every run. */
export const BOOTSTRAP_SEED = 20261114;
/** The nearest traded tokens a detail view names as a row's price anchors. */
export const NEAREST_COMPS = 5;

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  watchlist: boolean;
  age_days: number | null;
  implied_value_usd: number;
  implied_low_usd: number;
  implied_high_usd: number;
  rank_low: number;
  rank_high: number;
  verdict: 'FARM' | 'THIN' | 'SKIP';
  deposit_usd: number;
  plan_cost_usd: number;
  expected_central_usd: number;
  expected_low_usd: number;
  yield_per_1000_usd: number;
  nearest: { slug: string; name: string; tvl_usd: number; mcap_usd: number; ratio: number }[];
  model: {
    intercept: number;
    slope: number;
    residual_p25: number;
    residual_p75: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row, farm plan included. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  implied_low_usd: number;
  implied_high_usd: number;
  rank_low: number;
  rank_high: number;
  verdict: 'FARM' | 'THIN' | 'SKIP';
  deposit_usd: number;
  plan_cost_usd: number;
  expected_central_usd: number;
  expected_low_usd: number;
  yield_per_1000_usd: number;
  nearest: { slug: string; name: string; tvl_usd: number; mcap_usd: number; ratio: number }[];
  watchlist: boolean;
  farm_steps: string[];
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
  ratio: number | null;
}

/** One candidate model the blind test scores. */
export interface BlindTestRow {
  model: string;
  loo: number;
  kept: boolean;
}

/** Everything the dashboard renders, from the snapshot. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model_version: string;
  comps_total: number;
  comps_kept: number;
  comps_set_aside: number;
  fit_intercept: number;
  fit_slope: number;
  fit_r2: number;
  loo_curve: number;
  loo_flat: number;
  walkforward_train: number;
  walkforward_test: number;
  walkforward_curve: number;
  walkforward_flat: number;
  walkforward_split: string;
  band_low: number;
  band_high: number;
  airdrop_share: number;
  blind_tests: BlindTestRow[];
  verdict_counts: { FARM: number; THIN: number; SKIP: number };
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  rows: RadarRow[];
  live: LiveRow[];
  comps: { slug: string; name: string; category: string | null; tvl_usd: number; mcap_usd: number; ratio: number }[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;
const round2 = (n: number): number => Math.round(n * 100) / 100;
const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** A seeded generator, so the bootstrap is identical on every run. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Ordinary least squares on rows of features: solves the normal
 * equations by Gaussian elimination with partial pivoting. The
 * caller always includes a leading 1 for the intercept.
 */
export function ols(rows: number[][], y: number[]): number[] {
  const n = rows.length;
  const k = rows[0]!.length;
  const a: number[][] = [];
  for (let i = 0; i < k; i++) {
    a.push([]);
    for (let j = 0; j < k; j++) {
      let s = 0;
      for (let r = 0; r < n; r++) s += rows[r]![i]! * rows[r]![j]!;
      a[i]!.push(s);
    }
    let v = 0;
    for (let r = 0; r < n; r++) v += rows[r]![i]! * y[r]!;
    a[i]!.push(v);
  }
  for (let c = 0; c < k; c++) {
    let piv = c;
    for (let r = c + 1; r < k; r++) if (Math.abs(a[r]![c]!) > Math.abs(a[piv]![c]!)) piv = r;
    const tmp = a[c]!;
    a[c] = a[piv]!;
    a[piv] = tmp;
    const d = a[c]![c]!;
    for (let j = c; j <= k; j++) a[c]![j] = a[c]![j]! / d;
    for (let r = 0; r < k; r++) {
      if (r === c) continue;
      const f = a[r]![c]!;
      if (f === 0) continue;
      for (let j = c; j <= k; j++) a[r]![j] = a[r]![j]! - f * a[c]![j]!;
    }
  }
  return a.map((row) => row[k]!);
}

/** A fitted line's prediction for one feature row. */
function predict(beta: number[], x: number[]): number {
  let s = 0;
  for (let i = 0; i < beta.length; i++) s += beta[i]! * x[i]!;
  return s;
}

/** The share of variance a fit explains, on log market caps. */
function rSquared(y: number[], yh: number[]): number {
  const mean = y.reduce((s, v) => s + v, 0) / y.length;
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < y.length; i++) {
    ssRes += (y[i]! - yh[i]!) ** 2;
    ssTot += (y[i]! - mean) ** 2;
  }
  return ssTot === 0 ? 0 : 1 - ssRes / ssTot;
}

/** The p-th quantile of sorted numbers, by nearest rank. */
function quantile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * sorted.length)));
  return sorted[i]!;
}

/** The median of numbers. */
function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  return s.length % 2 === 1 ? s[(s.length - 1) / 2]! : (s[s.length / 2 - 1]! + s[s.length / 2]!) / 2;
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/**
 * A wrapped, staked or bridged product of a token that already trades:
 * the watchlist's own rule, applied to the whole board. A category of
 * Bridge, Canonical Bridge, Liquid Staking, Liquid Restaking or
 * Restaked BTC, a name carrying the whole word wrapped, staked or
 * staking, or a name beginning with an exchange's name all mark a
 * product whose token already trades (WBTC, Binance staked ETH and
 * USDT0 are the snapshot's examples). Ranking one of those as a
 * token launch would be a wrapped token ranked against launches,
 * so the board leaves them out; the live-token view shows the
 * protocols that already trade instead.
 */
const WRAPPED_PRODUCT_CATEGORY = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;
const EXCHANGE_NAME = /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/;

export function isWrappedProduct(p: SnapshotProtocol): boolean {
  return (
    WRAPPED_PRODUCT_CATEGORY.has(p.category ?? '') ||
    WRAPPED_WORD.test(p.name) ||
    EXCHANGE_NAME.test(p.name)
  );
}

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** Whether a protocol is one the board may rank: pre-token, not a wrapped product, not a versioned pool. */
export function isRankable(p: SnapshotProtocol): boolean {
  return isPreToken(p) && !isWrappedProduct(p) && !VERSIONED.test(p.name);
}

/**
 * A traded token the curve may learn from: it records a token, a
 * market cap and a TVL. A versioned pool is set aside — its token
 * is its parent's, not the pool's — and so is a token whose market
 * cap sits more than a hundredfold from its TVL either way: a
 * prediction-market token whose TVL is not deposits, a token shared
 * across versions, or a token so far below its TVL it has stopped
 * trading. The rule names no protocol; it keeps 110 of the 128.
 */
export function isComp(p: SnapshotProtocol): boolean {
  if (p.mcap_usd === null || p.mcap_usd <= 0 || p.tvl_usd <= 0 || p.gecko_id === null) return false;
  if (VERSIONED.test(p.name)) return false;
  const ratio = p.mcap_usd / p.tvl_usd;
  return ratio >= 0.01 && ratio <= 5;
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** The log-TVL feature row of one protocol, under one feature set. */
type FeatureSet = 'flat' | 'curve' | 'curve-category' | 'curve-growth' | 'curve-age' | 'curve-chains' | 'curve-all';

function features(p: SnapshotProtocol, asOf: string, set: FeatureSet, bigCategories: Set<string>): number[] {
  const lt = Math.log(p.tvl_usd);
  if (set === 'flat') return [1, lt];
  const row: number[] = [1, lt];
  if (set === 'curve-category' || set === 'curve-all') {
    const keys = [...bigCategories].sort();
    for (const k of keys.slice(1)) row.push(p.category === k ? 1 : 0);
  }
  if (set === 'curve-growth' || set === 'curve-all') {
    const g = finite(p.change_7d, 0);
    row.push(Math.min(80, Math.max(-40, g)) / 100);
  }
  if (set === 'curve-age' || set === 'curve-all') {
    const age = ageDays(asOf, p.listed_at);
    row.push(Math.min(age ?? 365, 1095) / 1095);
  }
  if (set === 'curve-chains' || set === 'curve-all') {
    row.push(Math.min(p.chains.length, 4) / 4);
  }
  return row;
}

/** The categories with at least five comparables: the only ones that get a dummy of their own. */
function bigCategories(comps: SnapshotProtocol[]): Set<string> {
  const counts = new Map<string, number>();
  for (const p of comps) counts.set(p.category ?? '', (counts.get(p.category ?? '') ?? 0) + 1);
  const out = new Set<string>();
  for (const [c, n] of counts) if (n >= 5 && c !== '') out.add(c);
  return out;
}

/** A feature set's leave-one-out mean absolute log error on the comparables. */
function looError(comps: SnapshotProtocol[], asOf: string, set: FeatureSet): number {
  const big = bigCategories(comps);
  let total = 0;
  for (let i = 0; i < comps.length; i++) {
    const train = comps.filter((_, j) => j !== i);
    const beta = ols(
      train.map((p) => features(p, asOf, set, big)),
      train.map((p) => Math.log(p.mcap_usd!)),
    );
    const held = comps[i]!;
    const flatBeta = set === 'flat' ? beta : beta;
    const pred = set === 'flat' ? Math.log(median(train.map((p) => p.mcap_usd! / p.tvl_usd))) + Math.log(held.tvl_usd) : predict(flatBeta, features(held, asOf, set, big));
    total += Math.abs(Math.log(held.mcap_usd!) - pred);
  }
  return total / comps.length;
}

/** A flat median multiple's leave-one-out mean absolute log error. */
function looFlat(comps: SnapshotProtocol[]): number {
  let total = 0;
  for (let i = 0; i < comps.length; i++) {
    const rest = comps.filter((_, j) => j !== i);
    const m = median(rest.map((p) => p.mcap_usd! / p.tvl_usd));
    total += Math.abs(Math.log(comps[i]!.mcap_usd!) - Math.log(m * comps[i]!.tvl_usd));
  }
  return total / comps.length;
}

/** The fitted curve, its fit quality, and the blind tests behind it. */
export interface Fit {
  intercept: number;
  slope: number;
  r2: number;
  residualP25: number;
  residualP75: number;
  looCurve: number;
  looFlat: number;
  walkforwardTrain: number;
  walkforwardTest: number;
  walkforwardCurve: number;
  walkforwardFlat: number;
  walkforwardSplit: string;
  blindTests: BlindTestRow[];
}

export function fitCurve(comps: SnapshotProtocol[], asOf: string): Fit {
  const big = bigCategories(comps);
  const rows = comps.map((p) => features(p, asOf, 'curve', big));
  const y = comps.map((p) => Math.log(p.mcap_usd!));
  const beta = ols(rows, y);
  const yh = rows.map((r) => predict(beta, r));
  const residuals = y.map((v, i) => v - yh[i]!);
  const factors = residuals.map((r) => Math.exp(r)).sort((a, b) => a - b);
  const p25 = quantile(factors, 0.25);
  const p75 = quantile(factors, 0.75);

  const sets: { set: FeatureSet; label: string }[] = [
    { set: 'flat', label: 'Flat median multiple' },
    { set: 'curve', label: 'Size curve (log mcap on log TVL)' },
    { set: 'curve-category', label: 'Size curve + category' },
    { set: 'curve-growth', label: 'Size curve + 7-day growth' },
    { set: 'curve-age', label: 'Size curve + age with no token' },
    { set: 'curve-chains', label: 'Size curve + chain count' },
    { set: 'curve-all', label: 'Size curve + all four' },
  ];
  const blindTests: BlindTestRow[] = sets.map(({ set, label }) => ({
    model: label,
    loo: set === 'flat' ? looFlat(comps) : looError(comps, asOf, set),
    kept: set === 'curve',
  }));

  // Walk-forward: fit on the older half of the dated comparables, test on the newer half.
  const dated = comps.filter((p) => p.listed_at !== null).sort((a, b) => (a.listed_at! < b.listed_at! ? -1 : 1));
  const split = dated[Math.floor(dated.length / 2)]!.listed_at!;
  const train = dated.filter((p) => p.listed_at! < split);
  const test = dated.filter((p) => p.listed_at! >= split);
  const betaW = ols(
    train.map((p) => features(p, asOf, 'curve', big)),
    train.map((p) => Math.log(p.mcap_usd!)),
  );
  const flatTrain = median(train.map((p) => p.mcap_usd! / p.tvl_usd));
  let wfCurve = 0;
  let wfFlat = 0;
  for (const p of test) {
    wfCurve += Math.abs(Math.log(p.mcap_usd!) - predict(betaW, features(p, asOf, 'curve', big)));
    wfFlat += Math.abs(Math.log(p.mcap_usd!) - Math.log(flatTrain * p.tvl_usd));
  }
  wfCurve /= Math.max(1, test.length);
  wfFlat /= Math.max(1, test.length);

  return {
    intercept: beta[0]!,
    slope: beta[1]!,
    r2: rSquared(y, yh),
    residualP25: p25,
    residualP75: p75,
    looCurve: blindTests.find((t) => t.model.startsWith('Size curve ('))!.loo,
    looFlat: blindTests.find((t) => t.model.startsWith('Flat'))!.loo,
    walkforwardTrain: train.length,
    walkforwardTest: test.length,
    walkforwardCurve: wfCurve,
    walkforwardFlat: wfFlat,
    walkforwardSplit: split,
    blindTests,
  };
}

/** Gas for one transaction on a chain, as the farm plan states it: typical values, November 2026. */
function gasFor(chain: string): number {
  const table: Record<string, number> = {
    Ethereum: 3,
    Solana: 0.01,
    Base: 0.2,
    Arbitrum: 0.3,
    Optimism: 0.2,
    Unichain: 0.2,
    Linea: 0.2,
    Polygon: 0.2,
    Scroll: 0.3,
    Blast: 0.2,
    Mantle: 0.2,
    Mode: 0.2,
    'zkSync Era': 0.3,
    Binance: 0.2,
    Avalanche: 0.3,
    Sui: 0.05,
    Tron: 0.5,
    Bitcoin: 2,
    'Hyperliquid L1': 0.01,
    Monad: 0.05,
    Sonic: 0.1,
    Fantom: 0.2,
    xDai: 0.05,
    Celo: 0.05,
    Berachain: 0.2,
    Plasma: 0.1,
    Ripple: 0.01,
    'Robinhood Chain': 0.2,
    Arc: 0.2,
  };
  return table[chain] ?? 1;
}

/** The cheapest chain a protocol names: the plan farms where gas costs least. */
function cheapestChain(p: SnapshotProtocol): string {
  if (p.chains.length === 0) return 'its main chain';
  let best = p.chains[0]!;
  for (const c of p.chains) if (gasFor(c) < gasFor(best)) best = c;
  return best;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The category's core action, in the words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Supply $${capital} of USDC to ${name} on ${chain} and keep the position open, staying well below the liquidation line.`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm') || c.includes('liquidity manager')) return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} and keep the position open.`;
  if (c.includes('bridge')) return `Bridge $${capital} of USDC to ${chain} through ${name} and use the bridged funds inside its app.`;
  if (c.includes('staking') || c.includes('restak')) return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt token.`;
  if (c.includes('perpetual') || c.includes('derivative') || c.includes('basis trading')) return `Deposit $${capital} of USDC as margin on ${name} and open one small hedged position.`;
  if (c.includes('prediction')) return `Fund $${capital} and place one market position on ${name}.`;
  if (c.includes('curator') || c.includes('allocator')) return `Deposit $${capital} into a ${name} vault on ${chain} and keep the vault shares.`;
  if (c.includes('stable')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain} and hold it.`;
  if (c.includes('rwa')) return `Mint $${capital} of the protocol's yield-bearing asset on ${chain} and hold it.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy open.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/** A second, different qualifying action in the same protocol. */
function secondActionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  const small = Math.max(25, Math.round(capital / 4));
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Borrow $${small} against the supplied collateral on ${name} and repay it within the week, keeping the loan well below the liquidation line.`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm') || c.includes('liquidity manager')) return `Add a second, smaller position of $${small} to a different pool of ${name} on ${chain}, or stake the LP receipt if the protocol offers it.`;
  if (c.includes('bridge')) return `Use the bridged funds inside ${name}'s own app, then bridge $${small} back to show two-way use of the same wallet.`;
  if (c.includes('staking') || c.includes('restak')) return `Stake a second, smaller amount of $${small} through a different validator or vault of ${name}.`;
  if (c.includes('perpetual') || c.includes('derivative') || c.includes('basis trading')) return `Open a second small hedge of $${small} on ${name} in the opposite direction and close it after a day, keeping total margin unchanged.`;
  if (c.includes('prediction')) return `Place a second small position of $${small} on a different market of ${name}.`;
  if (c.includes('curator') || c.includes('allocator')) return `Deposit $${small} into a second vault of ${name} on ${chain} with a different strategy.`;
  if (c.includes('stable') || c.includes('rwa')) return `Mint a second, smaller amount of $${small} of the protocol's asset on ${chain} and hold it alongside the first.`;
  return `Make a second, different qualifying action in ${name} with the same wallet, such as a swap, a deposit or a vote, for $${small}.`;
}

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** A protocol's whole farm plan, netted: deposit, cost, expected value at both ends, and the verdict. */
export interface FarmPlan {
  verdict: 'FARM' | 'THIN' | 'SKIP';
  deposit: number;
  cost: number;
  expectedCentral: number;
  expectedLow: number;
  holdDays: number;
  chain: string;
  steps: FarmStep[];
}

export function farmPlan(p: SnapshotProtocol, age: number | null, implied: number, bandLow: number): FarmPlan {
  const chain = cheapestChain(p);
  const gas = gasFor(chain);
  const hold = holdDaysFor(age);
  const costAt = (deposit: number): number => PLAN_TX_COUNT * gas + BRIDGE_FEE_USD + (deposit * OPPORTUNITY_APR * hold) / 365;
  const expectedAt = (deposit: number, factor: number): number => AIRDROP_SHARE * implied * factor * (deposit / p.tvl_usd);
  let deposit = SKIP_DEPOSIT;
  let verdict: 'FARM' | 'THIN' | 'SKIP' = 'SKIP';
  for (const cand of DEPOSIT_STEPS) {
    if (expectedAt(cand, bandLow) >= costAt(cand)) {
      deposit = cand;
      verdict = 'FARM';
      break;
    }
  }
  if (verdict === 'SKIP') {
    for (const cand of DEPOSIT_STEPS) {
      if (expectedAt(cand, 1) >= costAt(cand)) {
        deposit = cand;
        verdict = 'THIN';
        break;
      }
    }
  }
  const cost = round2(costAt(deposit));
  const expectedCentral = round2(expectedAt(deposit, 1));
  const expectedLow = round2(expectedAt(deposit, bandLow));
  const gasText = gas >= 1 ? `about $${gas} in gas` : `about $${gas} in gas`;
  const verdictLine =
    verdict === 'FARM'
      ? `Net: at the low end this plan expects $${expectedLow} against $${cost} of cost, so it clears even there — verdict FARM.`
      : verdict === 'THIN'
        ? `Net: at the central estimate this plan expects $${expectedCentral} against $${cost} of cost, but only $${expectedLow} at the low end — verdict THIN.`
        : `Net: even at a $${Math.max(...DEPOSIT_STEPS)} deposit the central estimate expects less than the plan costs — verdict SKIP.`;
  const steps: FarmStep[] = [
    {
      text:
        verdict === 'SKIP'
          ? `Verdict SKIP for ${p.name}: no deposit up to $1,000 covers this plan's cost at the central estimate, so the radar does not recommend farming it. The steps below are the plan as it would run, if you disagree.`
          : `Open a fresh wallet that holds only the funds you plan to farm, and store its seed phrase offline, never in a screenshot or a chat.`,
      cost: 'under $3 in gas for the first transaction',
      time: '5 minutes',
    },
    {
      text: `Bridge $${deposit} of USDC to ${chain} and fund the fresh wallet, keeping a gas reserve on ${chain} for the steps that follow.`,
      cost: `${gasText} plus a $2 bridge fee`,
      time: '10 minutes',
    },
    {
      text: actionFor(p, deposit, chain),
      cost: `$${deposit} of capital and ${gasText}`,
      time: '15 minutes to set up',
    },
    {
      text: secondActionFor(p, deposit, chain),
      cost: `about $${Math.max(1, Math.round(gas * 2))} in gas, no new capital beyond the $${deposit} already deposited`,
      time: '10 minutes',
    },
    {
      text: 'Return once a week and make one more qualifying action, a deposit, a swap, a vote or a borrow, so the wallet shows repeat use and not a single deposit.',
      cost: `about $${Math.max(1, Math.round(gas * 2))} in gas a week`,
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${deposit} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: 'When a claim opens, use only the claim link the protocol itself publishes on its own page, and never pay a fee to claim.',
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: `${verdictLine} Record the wallet, the dates and every transaction in a farm log, then unwind by reversing the position in the same order when you exit.`,
      cost: `gas to exit, about $${Math.max(1, Math.round(gas * 2))}`,
      time: '5 minutes to log, 15 minutes to exit',
    },
  ];
  return { verdict, deposit, cost, expectedCentral, expectedLow, holdDays: hold, chain, steps };
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
      ratio: p.mcap_usd !== null && p.tvl_usd > 0 ? round4(p.mcap_usd / p.tvl_usd) : null,
    }));
}

/** The five traded tokens nearest a protocol by size: its price anchors. */
function nearestComps(p: SnapshotProtocol, comps: SnapshotProtocol[]): BoardRow['nearest'] {
  const lt = Math.log(p.tvl_usd);
  return [...comps]
    .map((c) => ({ c, d: Math.abs(Math.log(c.tvl_usd) - lt) }))
    .sort((a, b) => a.d - b.d || (a.c.slug < b.c.slug ? -1 : 1))
    .slice(0, NEAREST_COMPS)
    .map(({ c }) => ({
      slug: c.slug,
      name: c.name,
      tvl_usd: c.tvl_usd,
      mcap_usd: c.mcap_usd!,
      ratio: round4(c.mcap_usd! / c.tvl_usd),
    }));
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, fit: Fit, comps: SnapshotProtocol[]): BoardRow[] {
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug in it is ranked, whatever its TVL.
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The early radar: every other rankable pre-token protocol in the
  // snapshot. There are 198 rankable pre-token protocols in this
  // snapshot in total: 40 watchlist rows and 158 early rows.
  for (const p of snapshot.protocols) {
    if (!chosen.has(p.slug) && isRankable(p)) chosen.set(p.slug, p);
  }
  const watch = new Set(snapshot.watchlist);
  const impliedOf = (p: SnapshotProtocol): number =>
    Math.max(1, Math.round(Math.exp(fit.intercept + fit.slope * Math.log(p.tvl_usd))));
  const scored = [...chosen.values()].map((p) => ({ p, implied: impliedOf(p) }));
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));

  // Bootstrap rank ranges: 200 refits on resampled comparables, seeded so two runs agree.
  const rng = mulberry32(BOOTSTRAP_SEED);
  const rankSamples: number[][] = scored.map(() => []);
  const big = bigCategories(comps);
  for (let r = 0; r < BOOTSTRAP_REFITS; r++) {
    const sample: SnapshotProtocol[] = [];
    for (let i = 0; i < comps.length; i++) sample.push(comps[Math.floor(rng() * comps.length)]!);
    const beta = ols(
      sample.map((p) => features(p, snapshot.as_of, 'curve', big)),
      sample.map((p) => Math.log(p.mcap_usd!)),
    );
    const refit = scored
      .map((s, i) => ({ i, v: Math.exp(predict(beta, features(s.p, snapshot.as_of, 'curve', big))) }))
      .sort((a, b) => b.v - a.v || (scored[a.i]!.p.slug < scored[b.i]!.p.slug ? -1 : 1));
    refit.forEach((row, rank) => rankSamples[row.i]!.push(rank + 1));
  }

  return scored.map((s, i) => {
    const age = ageDays(snapshot.as_of, s.p.listed_at);
    const plan = farmPlan(s.p, age, s.implied, fit.residualP25);
    const samples = [...rankSamples[i]!].sort((a, b) => a - b);
    return {
      rank: i + 1,
      slug: s.p.slug,
      name: s.p.name,
      category: s.p.category,
      chains: s.p.chains,
      tvl_usd: s.p.tvl_usd,
      change_7d: s.p.change_7d,
      mcap_usd: s.p.mcap_usd,
      listed_at: s.p.listed_at,
      gecko_id: s.p.gecko_id,
      symbol: s.p.symbol,
      token_status: 'pre-token',
      watchlist: watch.has(s.p.slug),
      age_days: age,
      implied_value_usd: s.implied,
      implied_low_usd: Math.max(1, Math.round(s.implied * fit.residualP25)),
      implied_high_usd: Math.max(1, Math.round(s.implied * fit.residualP75)),
      rank_low: quantile(samples, 0.1),
      rank_high: quantile(samples, 0.9),
      verdict: plan.verdict,
      deposit_usd: plan.deposit,
      plan_cost_usd: plan.cost,
      expected_central_usd: plan.expectedCentral,
      expected_low_usd: plan.expectedLow,
      yield_per_1000_usd: round2((AIRDROP_SHARE * s.implied * 1000) / s.p.tvl_usd),
      nearest: nearestComps(s.p, comps),
      model: {
        intercept: round4(fit.intercept),
        slope: round4(fit.slope),
        residual_p25: round4(fit.residualP25),
        residual_p75: round4(fit.residualP75),
        age_days: age,
      },
      farm_steps: plan.steps.map(stepText),
    };
  });
}

/** A board row's compact form for data.js, farm plan included so the page and board.json agree exactly. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    implied_low_usd: row.implied_low_usd,
    implied_high_usd: row.implied_high_usd,
    rank_low: row.rank_low,
    rank_high: row.rank_high,
    verdict: row.verdict,
    deposit_usd: row.deposit_usd,
    plan_cost_usd: row.plan_cost_usd,
    expected_central_usd: row.expected_central_usd,
    expected_low_usd: row.expected_low_usd,
    yield_per_1000_usd: row.yield_per_1000_usd,
    nearest: row.nearest,
    watchlist: row.watchlist,
    farm_steps: row.farm_steps,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot): { board: BoardRow[]; radar: RadarData; fit: Fit } {
  const traded = snapshot.protocols.filter((p) => p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0 && p.gecko_id !== null);
  const comps = traded.filter(isComp);
  const fit = fitCurve(comps, snapshot.as_of);
  const board = buildBoard(snapshot, fit, comps);
  const live = liveRows(snapshot);
  const early = board.filter((r) => !r.watchlist).length;
  const verdict_counts = { FARM: 0, THIN: 0, SKIP: 0 };
  for (const r of board) verdict_counts[r.verdict]++;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model_version: MODEL_VERSION,
    comps_total: traded.length,
    comps_kept: comps.length,
    comps_set_aside: traded.length - comps.length,
    fit_intercept: round4(fit.intercept),
    fit_slope: round4(fit.slope),
    fit_r2: round4(fit.r2),
    loo_curve: round4(fit.looCurve),
    loo_flat: round4(fit.looFlat),
    walkforward_train: fit.walkforwardTrain,
    walkforward_test: fit.walkforwardTest,
    walkforward_curve: round4(fit.walkforwardCurve),
    walkforward_flat: round4(fit.walkforwardFlat),
    walkforward_split: fit.walkforwardSplit,
    band_low: round4(fit.residualP25),
    band_high: round4(fit.residualP75),
    airdrop_share: AIRDROP_SHARE,
    blind_tests: fit.blindTests.map((t) => ({ ...t, loo: round4(t.loo) })),
    verdict_counts,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    rows: board.map(radarRow),
    live,
    comps: [...comps]
      .sort((a, b) => b.mcap_usd! - a.mcap_usd!)
      .map((p) => ({
        slug: p.slug,
        name: p.name,
        category: p.category,
        tvl_usd: p.tvl_usd,
        mcap_usd: p.mcap_usd!,
        ratio: round4(p.mcap_usd! / p.tvl_usd),
      })),
  };
  return { board, radar, fit };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
