import {
  isHealthDataAvailableAsync,
  requestAuthorization,
  getRequestStatusForAuthorization,
  queryCategorySamples,
  queryQuantitySamples,
  saveCategorySample,
  saveQuantitySample,
  CategoryValueSleepAnalysis,
} from '@kingstinct/react-native-healthkit';
import type { SleepDay, SleepStage, HealthMetrics } from '../types';
import { makeId } from './mockProvider';
import {
  computeRating,
  computeSleepFuel,
  computeReadiness,
  computeRecovery,
} from '../derive';
import type { SleepDataSource } from './SleepDataSource';

const SLEEP = 'HKCategoryTypeIdentifierSleepAnalysis';
const HR = 'HKQuantityTypeIdentifierHeartRate';
const HRV = 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN';
const RESP = 'HKQuantityTypeIdentifierRespiratoryRate';
const SPO2 = 'HKQuantityTypeIdentifierOxygenSaturation';

const READ_TYPES = [SLEEP, HR, HRV, RESP, SPO2] as const;
const SHARE_TYPES = [SLEEP, HR] as const;

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Map an HKCategoryValueSleepAnalysis value to our stage numbering
// (0=Awake, 1=REM, 2=Light, 3=Deep). "asleep"/"inBed"/unspecified -> Light.
function mapStage(value: number): number {
  switch (value) {
    case CategoryValueSleepAnalysis.awake:
      return 0;
    case CategoryValueSleepAnalysis.asleepREM:
      return 1;
    case CategoryValueSleepAnalysis.asleepDeep:
      return 3;
    case CategoryValueSleepAnalysis.asleepCore:
    default:
      return 2; // core / asleep / inBed / unspecified
  }
}

interface RawSample {
  start: number;
  end: number;
  value: number;
  prov?: string; // provenance code (watch/iphone/...) for the badge
  srcKey?: string; // raw source id, used to dedupe overlapping sources
}

const OWN_BUNDLE = 'com.markutilitylabs.sleeptracker';

const V = CategoryValueSleepAnalysis;
const isInBed = (v: number) => v === V.inBed; // value 0
const isAwakeV = (v: number) => v === V.awake; // value 2
// asleepUnspecified and the legacy "asleep" share value 1.
const isAsleepV = (v: number) =>
  v === V.asleepCore || v === V.asleepDeep || v === V.asleepREM || v === V.asleepUnspecified;

// A stable id for the writing source, so we can keep just one source per night
// (Apple Health dedupes; summing every source double-counts time).
function srcKeyOf(s: any): string {
  return (
    s?.sourceRevision?.source?.bundleIdentifier ||
    s?.sourceRevision?.source?.name ||
    s?.device?.name ||
    'unknown'
  );
}

// Read the true origin of a HealthKit sample from its device + sourceRevision.
function provenanceOf(s: any): string {
  const model: string = s?.device?.model ?? '';
  const productType: string = s?.sourceRevision?.productType ?? '';
  const bundle: string = s?.sourceRevision?.source?.bundleIdentifier ?? '';
  const name: string = s?.sourceRevision?.source?.name ?? '';
  if (/watch/i.test(model) || /^Watch/i.test(productType)) return 'watch';
  if (bundle === OWN_BUNDLE) return 'inserted';
  if (/iphone/i.test(model) || /^iPhone/i.test(productType)) return 'iphone';
  if (name) return `app:${name}`;
  return 'iphone';
}

// Most common provenance across a night's samples.
function dominantProv(night: RawSample[]): string {
  const counts: Record<string, number> = {};
  for (const s of night) {
    const p = s.prov ?? 'iphone';
    counts[p] = (counts[p] ?? 0) + (s.end - s.start);
  }
  return Object.keys(counts).reduce((a, b) => (counts[a] >= counts[b] ? a : b), 'iphone');
}

// Group sleep samples into nights: a gap > 3h between samples starts a new night.
function groupNights(samples: RawSample[]): RawSample[][] {
  if (samples.length === 0) return [];
  const sorted = [...samples].sort((a, b) => a.start - b.start);
  const nights: RawSample[][] = [];
  let current: RawSample[] = [sorted[0]];
  const GAP = 3 * 60 * 60 * 1000;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start - current[current.length - 1].end > GAP) {
      nights.push(current);
      current = [];
    }
    current.push(sorted[i]);
  }
  nights.push(current);
  return nights;
}

// Resample stage segments into fixed 15-min slots — ONLY for the hypnogram
// chart (the real stage durations are summed separately, not from these slots).
// Each slot takes the stage with the most overlap so short blocks aren't lost.
function toStages(segments: RawSample[], start: number, end: number, hrByTime: (t: number) => number): SleepStage[] {
  const night = segments;
  const slotMs = 15 * 60 * 1000;
  const stages: SleepStage[] = [];
  for (let t = start; t < end; t += slotMs) {
    const slotEnd = t + slotMs;
    const overlap: Record<number, number> = {};
    for (const s of night) {
      const o = Math.min(slotEnd, s.end) - Math.max(t, s.start);
      if (o > 0) {
        const st = mapStage(s.value);
        overlap[st] = (overlap[st] ?? 0) + o;
      }
    }
    let stage = 2;
    let best = -1;
    for (const k of Object.keys(overlap)) {
      if (overlap[+k] > best) {
        best = overlap[+k];
        stage = +k;
      }
    }
    const d = new Date(t);
    stages.push({
      time: `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`,
      stage,
      heartRate: Math.round(hrByTime(t)) || 58,
    });
  }
  return stages;
}

async function queryRange(identifier: string, startDate: Date, endDate: Date, unit: string): Promise<RawSample[]> {
  try {
    const res: any = await queryQuantitySamples(identifier as any, {
      filter: { startDate, endDate },
      limit: 0,
      ascending: true,
      unit, // pin the unit so HRV is ms (not seconds), HR is count/min, etc.
    } as any);
    return (res ?? []).map((s: any) => ({ start: +new Date(s.startDate), end: +new Date(s.endDate), value: s.quantity }));
  } catch {
    return [];
  }
}

function avg(nums: number[], fallback: number): number {
  const v = nums.filter(n => Number.isFinite(n));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : fallback;
}

const fmtClock = (ms: number) => {
  const d = new Date(ms);
  return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
};
const toMin = (ms: number) => Math.round(ms / 60000);

function buildDay(
  nightAll: RawSample[],
  hrSamples: RawSample[],
  hrvSamples: RawSample[],
  respSamples: RawSample[],
  spo2Samples: RawSample[]
): SleepDay {
  // Apple Health dedupes overlapping sources; if we sum every source we
  // double-count. Keep just the source with the most ASLEEP time (usually the
  // Apple Watch) for stage durations.
  const asleepBySrc: Record<string, number> = {};
  for (const s of nightAll) {
    if (isAsleepV(s.value)) {
      const k = s.srcKey ?? 'unknown';
      asleepBySrc[k] = (asleepBySrc[k] ?? 0) + (s.end - s.start);
    }
  }
  const primaryKey = Object.keys(asleepBySrc).sort((a, b) => asleepBySrc[b] - asleepBySrc[a])[0];
  const prim = primaryKey ? nightAll.filter(s => (s.srcKey ?? 'unknown') === primaryKey) : nightAll;

  // Precise stage minutes = sum of actual segment durations (not 15-min slots).
  let deepMs = 0, remMs = 0, lightMs = 0, awakeMs = 0;
  let firstAsleep = Infinity, lastAsleep = -Infinity;
  for (const s of prim) {
    const dur = s.end - s.start;
    if (s.value === V.asleepDeep) deepMs += dur;
    else if (s.value === V.asleepREM) remMs += dur;
    else if (s.value === V.asleepCore || s.value === V.asleepUnspecified) lightMs += dur;
    else if (s.value === V.awake) awakeMs += dur;
    if (isAsleepV(s.value)) {
      firstAsleep = Math.min(firstAsleep, s.start);
      lastAsleep = Math.max(lastAsleep, s.end);
    }
  }
  const deepMinutes = toMin(deepMs);
  const remMinutes = toMin(remMs);
  const lightMinutes = toMin(lightMs);
  const totalMinutes = deepMinutes + remMinutes + lightMinutes;
  const awakeMinutes = toMin(awakeMs);

  // Bedtime = earliest "in bed" across all sources (the sleep schedule), else
  // first asleep. Wake = last asleep end. Latency = bed → first asleep.
  const inBeds = nightAll.filter(s => isInBed(s.value));
  const bedStart = inBeds.length ? Math.min(...inBeds.map(s => s.start)) : firstAsleep;
  const wakeEnd = lastAsleep > -Infinity ? lastAsleep : Math.max(...prim.map(s => s.end));
  const bedtimeMs = Number.isFinite(bedStart) ? bedStart : nightAll[0].start;
  const lightsOffMinutes = Number.isFinite(firstAsleep) && firstAsleep > bedtimeMs ? toMin(firstAsleep - bedtimeMs) : 0;

  // Health metrics within the sleep window (0 => "—" in the UI).
  const inWindow = (s: RawSample) => s.start >= bedtimeMs - 36e5 && s.end <= wakeEnd + 36e5;
  const hrIn = hrSamples.filter(inWindow);
  const hrVals = hrIn.map(s => s.value);
  const hrvVals = hrvSamples.filter(inWindow).map(s => s.value);
  const respVals = respSamples.filter(inWindow).map(s => s.value);
  const spo2Vals = spo2Samples.filter(inWindow).map(s => s.value); // already 0-100 (unit '%')
  const hrByTime = (t: number) => {
    const near = hrIn.find(s => t >= s.start && t <= s.end);
    return near ? near.value : avg(hrVals, 0);
  };
  const health: HealthMetrics = {
    heartRateAvg: hrVals.length ? Math.round(avg(hrVals, 0)) : 0,
    heartRateMin: hrVals.length ? Math.round(Math.min(...hrVals)) : 0,
    heartRateMax: hrVals.length ? Math.round(Math.max(...hrVals)) : 0,
    hrv: hrvVals.length ? Math.round(avg(hrvVals, 0)) : 0,
    spo2: spo2Vals.length ? Math.round(avg(spo2Vals, 0) * 10) / 10 : 0,
    respRate: respVals.length ? Math.round(avg(respVals, 0) * 10) / 10 : 0,
    wristTemp: 0,
  };

  const timeInBed = Math.max(totalMinutes + awakeMinutes, toMin(wakeEnd - bedtimeMs));
  const efficiency = timeInBed > 0 ? Math.round((totalMinutes / timeInBed) * 100) : 0;
  const rating = computeRating(efficiency, deepMinutes, totalMinutes);
  const sleepFuel = computeSleepFuel(efficiency, deepMinutes, remMinutes);
  const recovery = computeRecovery(health.hrv, efficiency);
  const readiness = computeReadiness(sleepFuel, recovery, efficiency);

  // Hypnogram chart: resample the primary source's asleep+awake segments.
  const chartSegs = prim.filter(s => isAsleepV(s.value) || isAwakeV(s.value)).sort((a, b) => a.start - b.start);
  const chartStart = Number.isFinite(firstAsleep) ? firstAsleep : bedtimeMs;
  const stages = chartSegs.length ? toStages(chartSegs, chartStart, wakeEnd, hrByTime) : [];

  const ed = new Date(wakeEnd);
  return {
    id: makeId(),
    source: 'healthkit',
    healthSource: dominantProv(prim),
    date: `${monthNames[ed.getMonth()]} ${ed.getDate()}`,
    dayLabel: dayNames[ed.getDay()],
    isoDate: `${ed.getFullYear()}-${(ed.getMonth() + 1).toString().padStart(2, '0')}-${ed.getDate().toString().padStart(2, '0')}`,
    bedtime: fmtClock(bedtimeMs),
    wakeTime: fmtClock(wakeEnd),
    totalMinutes,
    deepMinutes,
    remMinutes,
    lightMinutes,
    awakeMinutes,
    efficiency,
    rating,
    stages,
    health,
    readiness,
    sleepFuel,
    lightsOffMinutes,
    priorDayStress: 0, // not measurable from sleep data; UI shows resting HR instead
    emoji: rating >= 80 ? '😌' : rating >= 60 ? '🙂' : '🥱',
    note: '',
    tags: [],
    apnea: { events: [], ahi: 0, riskScore: 0 },
    noise: [],
    snoring: [],
  };
}

export const healthKitProvider: SleepDataSource = {
  id: 'healthkit',

  async isAvailable() {
    try {
      return await isHealthDataAvailableAsync();
    } catch {
      return false;
    }
  },

  async requestPermissions() {
    try {
      await requestAuthorization({ toShare: SHARE_TYPES as any, toRead: READ_TYPES as any });
      // requestAuthorization resolves true once the prompt is handled; treat a
      // determined read status for sleep as "granted".
      const status: any = await getRequestStatusForAuthorization({ toRead: [SLEEP] as any });
      return status !== 'shouldRequest' && status !== 1;
    } catch {
      return false;
    }
  },

  async getSessions(rangeDays: number) {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - rangeDays * 24 * 60 * 60 * 1000);
    let sleepRaw: RawSample[] = [];
    try {
      const res: any = await queryCategorySamples(SLEEP as any, {
        filter: { startDate, endDate },
        limit: 0,
        ascending: true,
      } as any);
      // Keep "in bed" too (used for bedtime + sleep latency); dedupe by source
      // happens per-night in buildDay.
      sleepRaw = (res ?? []).map((s: any) => ({
        start: +new Date(s.startDate),
        end: +new Date(s.endDate),
        value: s.value,
        prov: provenanceOf(s),
        srcKey: srcKeyOf(s),
      }));
    } catch {
      sleepRaw = [];
    }
    if (sleepRaw.length === 0) return [];

    // Heart-rate and friends are logged continuously by the watch, so pulling
    // them over a long range is huge. Cap the metric window to the recent
    // ~45 days; older nights still show real sleep structure, with HR/HRV/etc
    // as "—".
    const metricStart = new Date(Math.max(startDate.getTime(), endDate.getTime() - 45 * 24 * 60 * 60 * 1000));
    const [hr, hrv, resp, spo2] = await Promise.all([
      queryRange(HR, metricStart, endDate, 'count/min'),
      queryRange(HRV, metricStart, endDate, 'ms'),
      queryRange(RESP, metricStart, endDate, 'count/min'),
      queryRange(SPO2, metricStart, endDate, '%'),
    ]);

    const nights = groupNights(sleepRaw).filter(n => n.length > 0);
    const days = nights.map(n => buildDay(n, hr, hrv, resp, spo2));
    // Oldest -> newest, matching mock provider ordering.
    return days.filter(d => d.totalMinutes > 0);
  },

  async getLatest() {
    const days = await this.getSessions(2);
    return days.length ? days[days.length - 1] : null;
  },
};

// Dev helper: seed the iOS Simulator's Health store with one realistic night so
// the read path can be verified without an Apple Watch. No-op on failure.
export async function seedHealthKitSampleNight(): Promise<boolean> {
  try {
    const now = new Date();
    const wake = new Date(now.getTime() - 30 * 60 * 1000);
    const bed = new Date(wake.getTime() - 8 * 60 * 60 * 1000); // 8h in bed
    // A "time in bed" period, then asleep stages after a latency, in varied
    // (non-15-min) chunks so the precise-duration path is exercised.
    await saveCategorySample(SLEEP as any, CategoryValueSleepAnalysis.inBed as any, bed, wake);
    const toHKValue = (st: number) =>
      st === 0 ? CategoryValueSleepAnalysis.awake
      : st === 1 ? CategoryValueSleepAnalysis.asleepREM
      : st === 3 ? CategoryValueSleepAnalysis.asleepDeep
      : CategoryValueSleepAnalysis.asleepCore;
    // [stage, minutes] segments after an ~11-min latency.
    const segs: [number, number][] = [
      [2, 18], [3, 42], [2, 25], [1, 17], [0, 6], [2, 30], [3, 35], [2, 20],
      [1, 22], [2, 28], [3, 18], [1, 24], [2, 32], [0, 8], [1, 19], [2, 26], [3, 12], [2, 40],
    ];
    let t = bed.getTime() + 11 * 60 * 1000;
    for (const [st, mins] of segs) {
      const s = new Date(t), e = new Date(t + mins * 60 * 1000);
      await saveCategorySample(SLEEP as any, toHKValue(st) as any, s, e);
      const hr = st === 3 ? 52 : st === 1 ? 62 : st === 0 ? 70 : 56;
      await saveQuantitySample(HR as any, 'count/min' as any, hr + Math.floor(Math.random() * 6 - 3), s, e);
      t = e.getTime();
    }
    return true;
  } catch {
    return false;
  }
}
