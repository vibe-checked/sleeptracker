import type { SleepDay, LiveSession, SleepStage } from './types';
import { recomputeDerived } from './derive';
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
export function synthesizeFromLive(live: LiveSession, endedAt: number): SleepDay {
  const start = new Date(live.startedAt);
  const end = new Date(endedAt);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const stages = live.samples.length > 0 ? live.samples : [liveSample(0, 0)];

  const hrs = stages.map(s => s.heartRate);
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
    totalMinutes: 0,
    deepMinutes: 0,
    remMinutes: 0,
    lightMinutes: 0,
    awakeMinutes: 0,
    efficiency: 0,
    rating: 0,
    stages,
    health: {
      heartRateAvg: Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length),
      heartRateMin: Math.min(...hrs),
      heartRateMax: Math.max(...hrs),
      hrv: 35 + Math.floor(Math.random() * 25),
      spo2: Math.round((95 + Math.random() * 3) * 10) / 10,
      respRate: 13 + Math.round(Math.random() * 4 * 10) / 10,
      wristTemp: 35.2 + Math.round(Math.random() * 1.5 * 10) / 10,
    },
    readiness: 0,
    sleepFuel: 0,
    lightsOffMinutes: 10,
    priorDayStress: 30 + Math.floor(Math.random() * 40),
    emoji: '😴',
    note: 'Tracked live',
    tags: [],
    apnea: { events: [], ahi: 0, riskScore: 0 },
    noise: [],
    snoring: [],
  };
  return recomputeDerived(base);
}
