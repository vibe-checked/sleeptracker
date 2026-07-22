import type { SleepDay, LiveSession, SleepStage, NoiseSample, SnoringSample } from './types';
import { recomputeDerived, computeEfficiency, emojiForRating } from './derive';
import { mockProvider, makeId } from './providers/mockProvider';
import type { SleepDataSource } from './providers/SleepDataSource';
import { load, save, KEYS } from './persistence';

const SCHEMA_VERSION = 1;
const SEED_DAYS = 30; // deeper history than the old 14 for long-term analytics

let activeSource: SleepDataSource = mockProvider;
export function setDataSource(source: SleepDataSource) {
  activeSource = source;
}

// Load persisted sessions; seed from the active provider on first run only.
export async function initSessions(): Promise<SleepDay[]> {
  await load<number>(KEYS.schemaVersion, SCHEMA_VERSION);
  const stored = await load<SleepDay[]>(KEYS.sessions, []);
  if (stored.length > 0) {
    return stored.map(backfill);
  }
  const seeded = await activeSource.getSessions(SEED_DAYS);
  await save(KEYS.sessions, seeded);
  await save(KEYS.schemaVersion, SCHEMA_VERSION);
  return seeded;
}

// Defensive: backfill any fields missing from older persisted data.
function backfill(d: SleepDay): SleepDay {
  return {
    ...d,
    id: d.id ?? makeId(),
    source: d.source ?? 'mock',
    tags: d.tags ?? [],
    apnea: d.apnea ?? { events: [], ahi: 0, riskScore: 0 },
    noise: d.noise ?? [],
    snoring: d.snoring ?? [],
  };
}

export async function persistSessions(sessions: SleepDay[]): Promise<void> {
  await save(KEYS.sessions, sessions);
}

// --- Live tracking ----------------------------------------------------------

export function newLiveSession(startedAt: number): LiveSession {
  return { startedAt, samples: [] };
}

// Generate one realistic stage sample for elapsed minutes into the session.
export function liveSample(elapsedMin: number, prevStage: number): SleepStage {
  const h = Math.floor(elapsedMin / 60);
  const m = elapsedMin % 60;
  const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  let stage: number;
  if (elapsedMin < 15) stage = 0;
  else {
    const cyclePhase = (elapsedMin % 90) / 90;
    if (cyclePhase < 0.2) stage = 2;
    else if (cyclePhase < 0.5) stage = 3;
    else if (cyclePhase < 0.7) stage = 2;
    else stage = 1;
    if (Math.random() < 0.04) stage = 0;
  }
  const baseHR = stage === 3 ? 52 : stage === 1 ? 62 : stage === 0 ? 70 : 56;
  return { time, stage, heartRate: baseHR + Math.floor(Math.random() * 8 - 4) };
}

// Turn an accumulated live session into a full, persisted-ready SleepDay.
const MAX_NIGHT_SLOTS = 600; // cap a synthesized night at ~10h so a long demo run stays believable

interface TrackExtra {
  noise?: NoiseSample[];
  snoring?: SnoringSample[];
  hasHeartRate?: boolean; // false for phone-sensor sessions (no HR sensor)
}

export function synthesizeFromLive(live: LiveSession, endedAt: number, extra: TrackExtra = {}): SleepDay {
  const end = new Date(endedAt);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  // The live tracker records one sample per minute. Stage minutes are summed
  // from the per-minute samples (1 sample = 1 min); the 15-min bins below are
  // only for the hypnogram chart.
  const BIN = 15;
  const rawStages = (live.samples.length > 0 ? live.samples : [liveSample(0, 0)]).slice(-24 * 60);
  const rawNoise = (extra.noise ?? []).slice(-24 * 60);
  const rawSnore = (extra.snoring ?? []).slice(-24 * 60);

  const dominantStage = (chunk: SleepStage[]): number => {
    const counts: Record<number, number> = {};
    for (const s of chunk) counts[s.stage] = (counts[s.stage] ?? 0) + 1;
    return Number(Object.keys(counts).reduce((a, b) => (counts[+a] >= counts[+b] ? a : b)));
  };
  const avgOf = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);

  const stages: SleepStage[] = [];
  const noise: NoiseSample[] = [];
  const snoring: SnoringSample[] = [];
  for (let i = 0; i < rawStages.length; i += BIN) {
    const cs = rawStages.slice(i, i + BIN);
    const chunkHrs = cs.map(s => s.heartRate).filter(h => h > 0);
    stages.push({ time: cs[0].time, stage: dominantStage(cs), heartRate: chunkHrs.length ? Math.round(avgOf(chunkHrs)) : 0 });
    const cn = rawNoise.slice(i, i + BIN);
    if (cn.length) noise.push({ time: cn[0].time, db: Math.round(avgOf(cn.map(n => n.db))) });
    const csn = rawSnore.slice(i, i + BIN);
    if (csn.length) snoring.push({ time: csn[0].time, intensity: Math.max(0, ...csn.map(s => s.intensity)) });
  }
  // Precise stage minutes: one per-minute sample = one minute of that stage.
  const stageMin = (n: number) => rawStages.filter(s => s.stage === n).length;
  const deepMinutes = stageMin(3);
  const remMinutes = stageMin(1);
  const lightMinutes = stageMin(2);
  const awakeMinutes = stageMin(0);
  const totalMinutes = deepMinutes + remMinutes + lightMinutes;
  const efficiency = computeEfficiency(totalMinutes, awakeMinutes);

  // Bedtime = when tracking actually started (bounded to the sampled window).
  const startMs = Math.max(live.startedAt, endedAt - rawStages.length * 60 * 1000 - 60 * 1000);
  const start = new Date(Math.min(startMs, endedAt));

  const hrs = stages.map(s => s.heartRate).filter(h => h > 0);
  const hasHR = extra.hasHeartRate !== false && hrs.length > 0;
  const iso = `${end.getFullYear()}-${(end.getMonth() + 1).toString().padStart(2, '0')}-${end
    .getDate()
    .toString()
    .padStart(2, '0')}`;

  const base: SleepDay = {
    id: makeId(),
    source: 'tracked',
    date: `${monthNames[end.getMonth()]} ${end.getDate()}`,
    dayLabel: dayNames[end.getDay()],
    isoDate: iso,
    bedtime: `${start.getHours()}:${start.getMinutes().toString().padStart(2, '0')}`,
    wakeTime: `${end.getHours()}:${end.getMinutes().toString().padStart(2, '0')}`,
    totalMinutes,
    deepMinutes,
    remMinutes,
    lightMinutes,
    awakeMinutes,
    efficiency,
    rating: 0,
    stages,
    // Phone tracking has no heart-rate/SpO2/HRV/temp sensors → 0 = unavailable
    // (the UI shows these as "—").
    health: {
      heartRateAvg: hasHR ? Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length) : 0,
      heartRateMin: hasHR ? Math.min(...hrs) : 0,
      heartRateMax: hasHR ? Math.max(...hrs) : 0,
      hrv: 0,
      spo2: 0,
      respRate: 0,
      wristTemp: 0,
    },
    readiness: 0,
    sleepFuel: 0,
    // Sleep latency = minutes of "awake" samples before the first sleep sample.
    lightsOffMinutes: Math.max(0, rawStages.findIndex(s => s.stage !== 0)),
    priorDayStress: 0, // iPhone tracking can't measure stress; UI shows resting HR
    emoji: '😴',
    note: 'Tracked with iPhone',
    tags: [],
    apnea: { events: [], ahi: 0, riskScore: 0 },
    noise,
    snoring,
  };
  const day = recomputeDerived(base);
  return { ...day, emoji: emojiForRating(day.rating) };
}
