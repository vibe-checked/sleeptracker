import type {
  SleepDay,
  SleepStage,
  SleepTag,
  ApneaData,
  ApneaEvent,
  NoiseSample,
  SnoringSample,
} from '../types';
import { TAG_LIBRARY } from '../types';
import {
  countStageMinutes,
  computeEfficiency,
  computeRating,
  computeSleepFuel,
  computeReadiness,
} from '../derive';
import type { SleepDataSource } from './SleepDataSource';

let idCounter = 0;
export function makeId(): string {
  idCounter += 1;
  return `s_${Date.now().toString(36)}_${idCounter}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

const emojis = ['😴', '😊', '🥱', '💤', '😌', '🌙', '✨', '😐', '🙂', '😪'];
const notes = [
  'Felt rested', 'Woke up once', 'Deep sleep felt good', 'Restless night',
  'Vivid dreams', 'Perfect night', 'Late caffeine', 'Exercised before bed',
  'Stressed from work', 'Great recovery', '', '', '', '',
];

function generateStages(bedHour: number, wakeHour: number): SleepStage[] {
  const stages: SleepStage[] = [];
  const totalHours = wakeHour > bedHour ? wakeHour - bedHour : 24 - bedHour + wakeHour;
  const totalSlots = totalHours * 4;
  let currentStage = 0;
  const cycleLength = 24;

  for (let i = 0; i < totalSlots; i++) {
    const hour = (bedHour + Math.floor(i / 4)) % 24;
    const min = (i % 4) * 15;
    const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
    const progress = i / totalSlots;
    const cyclePhase = (i % cycleLength) / cycleLength;

    if (i < 2) {
      currentStage = 0;
    } else if (i >= totalSlots - 2) {
      currentStage = Math.random() > 0.5 ? 0 : 2;
    } else if (cyclePhase < 0.15) {
      currentStage = 2;
    } else if (cyclePhase < 0.45) {
      currentStage = progress < 0.6 ? 3 : 2;
    } else if (cyclePhase < 0.7) {
      currentStage = 2;
    } else if (cyclePhase < 0.9) {
      currentStage = progress > 0.3 ? 1 : 2;
    } else {
      currentStage = Math.random() > 0.85 ? 0 : 2;
    }
    if (Math.random() < 0.03) currentStage = 0;

    const baseHR = currentStage === 3 ? 52 : currentStage === 1 ? 62 : currentStage === 0 ? 70 : 56;
    const heartRate = baseHR + Math.floor(Math.random() * 8 - 4);
    stages.push({ time, stage: currentStage, heartRate });
  }
  return stages;
}

function generateApnea(stages: SleepStage[], spo2: number): ApneaData {
  const events: ApneaEvent[] = [];
  // Lower SpO2 → more events. Base rate scaled by a random per-night factor.
  const proneness = Math.max(0, (97 - spo2)) * 0.8 + Math.random() * 4;
  stages.forEach(s => {
    // Events cluster in REM (1) and light (2) sleep.
    const stageFactor = s.stage === 1 ? 1.4 : s.stage === 2 ? 1 : 0.3;
    if (Math.random() < (proneness / 100) * stageFactor) {
      events.push({
        time: s.time,
        durationSec: 10 + Math.floor(Math.random() * 25),
        severity: 30 + Math.floor(Math.random() * 70),
      });
    }
  });
  const hours = Math.max(1, stages.length / 4);
  const ahi = Math.round((events.length / hours) * 10) / 10;
  // AHI: <5 normal, 5-15 mild, 15-30 moderate, >30 severe → map to 0-100 risk.
  const riskScore = Math.min(100, Math.round((ahi / 30) * 100));
  return { events, ahi, riskScore };
}

function generateNoise(stages: SleepStage[]): NoiseSample[] {
  return stages.map(s => {
    const base = 28 + Math.random() * 6; // quiet room baseline
    const spike = Math.random() < 0.08 ? 10 + Math.random() * 25 : 0;
    return { time: s.time, db: Math.round((base + spike) * 10) / 10 };
  });
}

function generateSnoring(stages: SleepStage[]): SnoringSample[] {
  return stages.map(s => {
    // Snoring more likely in deep/light sleep, rarely when awake.
    const likely = s.stage === 3 ? 0.35 : s.stage === 2 ? 0.2 : s.stage === 1 ? 0.1 : 0;
    const intensity = Math.random() < likely ? 20 + Math.floor(Math.random() * 70) : 0;
    return { time: s.time, intensity };
  });
}

function pickTags(stress: number, lightsOff: number): SleepTag[] {
  const chosen: SleepTag[] = [];
  const maybe = (id: string, p: number) => {
    if (Math.random() < p) {
      const t = TAG_LIBRARY.find(x => x.id === id);
      if (t && !chosen.includes(t)) chosen.push(t);
    }
  };
  maybe('caffeine', lightsOff > 20 ? 0.5 : 0.2);
  maybe('alcohol', 0.18);
  maybe('exercise', 0.3);
  maybe('screen-time', 0.4);
  maybe('stress', stress > 55 ? 0.6 : 0.15);
  maybe('late-meal', 0.2);
  maybe('reading', 0.2);
  maybe('meditation', 0.15);
  return chosen;
}

export function generateDay(daysAgo: number): SleepDay {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const bedHour = 22 + Math.floor(Math.random() * 2);
  const bedMin = Math.floor(Math.random() * 4) * 15;
  const wakeHour = 6 + Math.floor(Math.random() * 2);
  const wakeMin = Math.floor(Math.random() * 4) * 15;

  const stages = generateStages(bedHour, wakeHour);
  const deepMin = countStageMinutes(stages, 3);
  const remMin = countStageMinutes(stages, 1);
  const lightMin = countStageMinutes(stages, 2);
  const awakeMin = countStageMinutes(stages, 0);
  const totalMin = deepMin + remMin + lightMin;
  const efficiency = computeEfficiency(totalMin, awakeMin);
  const rating = computeRating(efficiency, deepMin, totalMin, Math.random() * 15);

  const lightsOffMinutes = 5 + Math.floor(Math.random() * 25);
  const priorDayStress = 20 + Math.floor(Math.random() * 60);
  const sleepFuel = computeSleepFuel(efficiency, deepMin, remMin);
  const readiness = computeReadiness(sleepFuel, priorDayStress, efficiency, Math.random() * 10 - 5);

  const spo2 = Math.round((95 + Math.random() * 3) * 10) / 10;
  const health = {
    heartRateAvg: 55 + Math.floor(Math.random() * 8),
    heartRateMin: 45 + Math.floor(Math.random() * 6),
    heartRateMax: 72 + Math.floor(Math.random() * 10),
    hrv: 35 + Math.floor(Math.random() * 25),
    spo2,
    respRate: 13 + Math.round(Math.random() * 4 * 10) / 10,
    wristTemp: 35.2 + Math.round(Math.random() * 1.5 * 10) / 10,
  };

  const iso = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date
    .getDate()
    .toString()
    .padStart(2, '0')}`;

  return {
    id: makeId(),
    source: 'mock',
    date: `${monthNames[date.getMonth()]} ${date.getDate()}`,
    dayLabel: dayNames[date.getDay()],
    isoDate: iso,
    bedtime: `${bedHour}:${bedMin.toString().padStart(2, '0')}`,
    wakeTime: `${wakeHour}:${wakeMin.toString().padStart(2, '0')}`,
    totalMinutes: totalMin,
    deepMinutes: deepMin,
    remMinutes: remMin,
    lightMinutes: lightMin,
    awakeMinutes: awakeMin,
    efficiency,
    rating,
    stages,
    health,
    readiness,
    sleepFuel,
    lightsOffMinutes,
    priorDayStress,
    emoji: emojis[Math.floor(Math.random() * emojis.length)],
    note: notes[Math.floor(Math.random() * notes.length)],
    tags: pickTags(priorDayStress, lightsOffMinutes),
    apnea: generateApnea(stages, spo2),
    noise: generateNoise(stages),
    snoring: generateSnoring(stages),
  };
}

export const mockProvider: SleepDataSource = {
  id: 'mock',
  async isAvailable() {
    return true;
  },
  async requestPermissions() {
    return true;
  },
  async getSessions(rangeDays: number) {
    return Array.from({ length: rangeDays }, (_, i) => generateDay(rangeDays - 1 - i));
  },
  async getLatest() {
    return generateDay(0);
  },
};
