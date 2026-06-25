// Pure type definitions for the sleep data layer. No logic, no generation.

export interface SleepStage {
  time: string;
  stage: number; // 0=Awake, 1=REM, 2=Light, 3=Deep
  heartRate: number;
}

export interface HealthMetrics {
  heartRateAvg: number;
  heartRateMin: number;
  heartRateMax: number;
  hrv: number;
  spo2: number;
  respRate: number;
  wristTemp: number;
}

export type SleepSource = 'mock' | 'healthkit' | 'manual' | 'tracked';

export type TagCategory = 'intake' | 'activity' | 'state' | 'environment';

export interface SleepTag {
  id: string;
  label: string;
  category: TagCategory;
  icon: string;
}

export interface ApneaEvent {
  time: string;
  durationSec: number;
  severity: number; // 0-100
}

export interface ApneaData {
  events: ApneaEvent[];
  ahi: number; // apnea-hypopnea index (events/hour)
  riskScore: number; // 0-100
}

export interface NoiseSample {
  time: string;
  db: number;
}

export interface SnoringSample {
  time: string;
  intensity: number; // 0-100
}

export interface SleepDay {
  id: string;
  source: SleepSource;
  date: string;
  dayLabel: string;
  isoDate: string; // YYYY-MM-DD for analytics / calendar
  bedtime: string;
  wakeTime: string;
  totalMinutes: number;
  deepMinutes: number;
  remMinutes: number;
  lightMinutes: number;
  awakeMinutes: number;
  efficiency: number;
  rating: number; // 0-100
  stages: SleepStage[];
  health: HealthMetrics;
  readiness: number; // 0-100
  sleepFuel: number; // 0-100
  lightsOffMinutes: number; // time to fall asleep
  priorDayStress: number; // 0-100
  emoji: string;
  note: string;
  tags: SleepTag[];
  apnea: ApneaData;
  noise: NoiseSample[];
  snoring: SnoringSample[];
  edited?: boolean;
  // For HealthKit nights, the true provenance read from the sample metadata:
  // 'watch' | 'iphone' | 'inserted' (written by this app) | an app name.
  healthSource?: string;
}

export interface SleepGoals {
  sleepGoal: number; // minutes
  deepGoal: number; // minutes
  qualityGoal: number; // rating target
}

export interface SmartAlarmConfig {
  enabled: boolean;
  wakeHour: number;
  wakeMin: number;
  windowMin: number; // 15 / 30 / 45
}

export interface SleepSettings {
  temperatureUnit: 'C' | 'F';
}

// In-progress live tracking state, persisted so it survives backgrounding/kill.
export interface LiveSession {
  startedAt: number; // epoch ms
  samples: SleepStage[];
}

export const TAG_LIBRARY: SleepTag[] = [
  { id: 'caffeine', label: 'Caffeine', category: 'intake', icon: '☕' },
  { id: 'alcohol', label: 'Alcohol', category: 'intake', icon: '🍷' },
  { id: 'late-meal', label: 'Late Meal', category: 'intake', icon: '🍽️' },
  { id: 'water', label: 'Hydrated', category: 'intake', icon: '💧' },
  { id: 'exercise', label: 'Exercise', category: 'activity', icon: '🏃' },
  { id: 'screen-time', label: 'Screen Time', category: 'activity', icon: '📱' },
  { id: 'reading', label: 'Reading', category: 'activity', icon: '📖' },
  { id: 'meditation', label: 'Meditation', category: 'activity', icon: '🧘' },
  { id: 'stress', label: 'Stress', category: 'state', icon: '😰' },
  { id: 'sick', label: 'Unwell', category: 'state', icon: '🤒' },
  { id: 'travel', label: 'Travel', category: 'state', icon: '✈️' },
  { id: 'nap', label: 'Napped', category: 'state', icon: '😴' },
  { id: 'cold-room', label: 'Cold Room', category: 'environment', icon: '❄️' },
  { id: 'warm-room', label: 'Warm Room', category: 'environment', icon: '🔥' },
  { id: 'noisy', label: 'Noisy', category: 'environment', icon: '🔊' },
];
