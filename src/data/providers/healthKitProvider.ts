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
  countStageMinutes,
  computeEfficiency,
  computeRating,
  computeSleepFuel,
  computeReadiness,
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

// Resample a night's stage segments into fixed 15-min slots so our charts
// (which assume one stage per 15 min) render consistently. Each slot takes the
// stage with the most overlap so short deep/REM blocks aren't dropped.
function toStages(night: RawSample[], hrByTime: (t: number) => number): SleepStage[] {
  const start = night[0].start;
  const end = night[night.length - 1].end;
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

async function queryRange(identifier: string, startDate: Date, endDate: Date): Promise<RawSample[]> {
  try {
    const res: any = await queryQuantitySamples(identifier as any, {
      filter: { startDate, endDate },
      limit: 0,
      ascending: true,
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

async function buildDay(night: RawSample[], hrSamples: RawSample[], hrvSamples: RawSample[], respSamples: RawSample[], spo2Samples: RawSample[]): Promise<SleepDay> {
  const start = night[0].start;
  const end = night[night.length - 1].end;
  const inWindow = (s: RawSample) => s.start >= start - 36e5 && s.end <= end + 36e5;
  const hrIn = hrSamples.filter(inWindow);
  const hrByTime = (t: number) => {
    const near = hrIn.find(s => t >= s.start && t <= s.end);
    return near ? near.value : avg(hrIn.map(s => s.value), 58);
  };

  const stages = toStages(night, hrByTime);
  const deepMinutes = countStageMinutes(stages, 3);
  const remMinutes = countStageMinutes(stages, 1);
  const lightMinutes = countStageMinutes(stages, 2);
  const awakeMinutes = countStageMinutes(stages, 0);
  const totalMinutes = deepMinutes + remMinutes + lightMinutes;
  const efficiency = computeEfficiency(totalMinutes, awakeMinutes);
  const rating = computeRating(efficiency, deepMinutes, totalMinutes);
  const sleepFuel = computeSleepFuel(efficiency, deepMinutes, remMinutes);
  const priorDayStress = 35;
  const readiness = computeReadiness(sleepFuel, priorDayStress, efficiency);

  const hrVals = hrIn.map(s => s.value);
  const spo2Pct = avg(spo2Samples.filter(inWindow).map(s => s.value * 100), 96.5);
  const health: HealthMetrics = {
    heartRateAvg: Math.round(avg(hrVals, 58)),
    heartRateMin: hrVals.length ? Math.round(Math.min(...hrVals)) : 50,
    heartRateMax: hrVals.length ? Math.round(Math.max(...hrVals)) : 75,
    hrv: Math.round(avg(hrvSamples.filter(inWindow).map(s => s.value), 45)),
    spo2: Math.round(spo2Pct * 10) / 10,
    respRate: Math.round(avg(respSamples.filter(inWindow).map(s => s.value), 14) * 10) / 10,
    wristTemp: 0, // not available without a Series 8+/Ultra wrist-temp sensor
  };

  const sd = new Date(start);
  const ed = new Date(end);
  return {
    id: makeId(),
    source: 'healthkit',
    date: `${monthNames[ed.getMonth()]} ${ed.getDate()}`,
    dayLabel: dayNames[ed.getDay()],
    isoDate: `${ed.getFullYear()}-${(ed.getMonth() + 1).toString().padStart(2, '0')}-${ed.getDate().toString().padStart(2, '0')}`,
    bedtime: `${sd.getHours()}:${sd.getMinutes().toString().padStart(2, '0')}`,
    wakeTime: `${ed.getHours()}:${ed.getMinutes().toString().padStart(2, '0')}`,
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
    lightsOffMinutes: 12,
    priorDayStress,
    emoji: rating >= 80 ? '😌' : rating >= 60 ? '🙂' : '🥱',
    note: '',
    tags: [],
    // Apnea/noise/snoring aren't in HealthKit; leave empty (UI hides/zeros them).
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
      // Only count actual "asleep" stages, not "inBed".
      sleepRaw = (res ?? [])
        .filter((s: any) => s.value !== CategoryValueSleepAnalysis.inBed)
        .map((s: any) => ({ start: +new Date(s.startDate), end: +new Date(s.endDate), value: s.value }));
    } catch {
      sleepRaw = [];
    }
    if (sleepRaw.length === 0) return [];

    const [hr, hrv, resp, spo2] = await Promise.all([
      queryRange(HR, startDate, endDate),
      queryRange(HRV, startDate, endDate),
      queryRange(RESP, startDate, endDate),
      queryRange(SPO2, startDate, endDate),
    ]);

    const nights = groupNights(sleepRaw).filter(n => n.length > 0);
    const days = await Promise.all(nights.map(n => buildDay(n, hr, hrv, resp, spo2)));
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
    const bed = new Date(wake.getTime() - 7.5 * 60 * 60 * 1000);
    const slotMs = 15 * 60 * 1000;
    const cycle = [2, 2, 3, 3, 2, 1, 2, 3, 2, 1, 0, 2, 1, 2, 1];
    const toHKValue = (st: number) =>
      st === 0 ? CategoryValueSleepAnalysis.awake
      : st === 1 ? CategoryValueSleepAnalysis.asleepREM
      : st === 3 ? CategoryValueSleepAnalysis.asleepDeep
      : CategoryValueSleepAnalysis.asleepCore;
    let i = 0;
    for (let t = bed.getTime(); t < wake.getTime(); t += slotMs, i++) {
      const st = cycle[i % cycle.length];
      const s = new Date(t), e = new Date(t + slotMs);
      await saveCategorySample(SLEEP as any, toHKValue(st) as any, s, e);
      const hr = st === 3 ? 52 : st === 1 ? 62 : st === 0 ? 70 : 56;
      await saveQuantitySample(HR as any, 'count/min' as any, hr + Math.floor(Math.random() * 6 - 3), s, e);
    }
    return true;
  } catch {
    return false;
  }
}
