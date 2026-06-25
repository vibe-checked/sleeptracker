// Pure derivation + utility functions. No randomness, no I/O.
// Used by the mock generator AND by the edit flow (recompute on change).

import type { SleepDay, SleepStage, SleepGoals, SleepSource } from './types';

// Human label + icon for where a night's data came from. For HealthKit nights
// this reflects the true provenance read from the sample (watch / iPhone / which
// app inserted it).
export function sourceLabel(day: Pick<SleepDay, 'source' | 'healthSource'>): { label: string; icon: string } {
  if (day.source === 'healthkit') {
    const h = day.healthSource ?? '';
    if (h === 'watch') return { label: 'Apple Watch', icon: '⌚' };
    if (h === 'iphone') return { label: 'iPhone (Health)', icon: '📲' };
    if (h === 'inserted') return { label: 'Inserted', icon: '✨' };
    if (h.startsWith('app:')) return { label: h.slice(4), icon: '❤️' };
    return { label: 'Apple Health', icon: '❤️' };
  }
  switch (day.source) {
    case 'tracked':
      return { label: 'iPhone', icon: '📱' };
    case 'manual':
      return { label: 'Manual', icon: '✎' };
    default:
      return { label: 'Sample', icon: '✨' };
  }
}

export const DEFAULT_GOALS: SleepGoals = {
  sleepGoal: 480,
  deepGoal: 90,
  qualityGoal: 85,
};

export function countStageMinutes(stages: SleepStage[], stageNum: number): number {
  return stages.filter(s => s.stage === stageNum).length * 15;
}

export function computeEfficiency(totalMin: number, awakeMin: number): number {
  if (totalMin + awakeMin === 0) return 0;
  return Math.round((totalMin / (totalMin + awakeMin)) * 100);
}

export function computeRating(efficiency: number, deepMin: number, totalMin: number, jitter = 0): number {
  if (totalMin === 0) return 0;
  return Math.min(100, Math.round(efficiency * 0.6 + (deepMin / totalMin) * 100 * 0.25 + jitter));
}

export function computeSleepFuel(efficiency: number, deepMin: number, remMin: number): number {
  return Math.min(100, Math.round(efficiency * 0.4 + (deepMin / 90) * 30 + (remMin / 120) * 30));
}

// Recovery from sleeping HRV (a real, measured signal). Typical sleeping SDNN
// ~25–65 ms maps to 0–100. With no HRV (iPhone-only tracking) fall back to
// efficiency so the gauge still reflects something real.
export function computeRecovery(hrv: number, efficiency: number): number {
  if (!hrv || hrv <= 0) return efficiency;
  return Math.max(5, Math.min(100, Math.round(((hrv - 25) / 40) * 100)));
}

// Readiness = composite of sleep fuel, HRV-based recovery, and efficiency.
// All inputs are derived from real data (no fabricated "stress").
export function computeReadiness(
  sleepFuel: number,
  recovery: number,
  efficiency: number,
  jitter = 0
): number {
  return Math.max(
    0,
    Math.min(100, Math.round(sleepFuel * 0.4 + recovery * 0.3 + efficiency * 0.3 + jitter))
  );
}

// Recompute the composite scores after an edit. Edits (bed/wake times, tags,
// notes, emoji) don't change the measured stage minutes or efficiency, so those
// are preserved exactly — important so editing a HealthKit night keeps its
// precise, Apple-Health-matching durations.
export function recomputeDerived(day: SleepDay): SleepDay {
  const { efficiency, deepMinutes, remMinutes, totalMinutes } = day;
  const rating = computeRating(efficiency, deepMinutes, totalMinutes);
  const sleepFuel = computeSleepFuel(efficiency, deepMinutes, remMinutes);
  const recovery = computeRecovery(day.health.hrv, efficiency);
  const readiness = computeReadiness(sleepFuel, recovery, efficiency);
  return { ...day, rating, sleepFuel, readiness };
}

export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}h ${m}m`;
}

export function getSleepBank(history: SleepDay[], goals: SleepGoals): number[] {
  let balance = 0;
  return history.slice(-7).map(d => {
    balance += d.totalMinutes - goals.sleepGoal;
    return balance;
  });
}

export function getTonightBedtime(history: SleepDay[], goals: SleepGoals): string {
  const recent = history.slice(-7);
  if (recent.length === 0) return '22:30';
  const avgBedHour =
    recent.reduce((s, d) => {
      const [h] = d.bedtime.split(':').map(Number);
      return s + (h >= 20 ? h : h + 24);
    }, 0) / recent.length;
  const bankBalance = getSleepBank(history, goals);
  const lastBalance = bankBalance[bankBalance.length - 1] ?? 0;
  let adjustedHour = avgBedHour;
  if (lastBalance < -60) adjustedHour -= 0.5;
  if (lastBalance < -120) adjustedHour -= 0.5;
  const h = Math.round(adjustedHour) % 24;
  const m = Math.round((adjustedHour % 1) * 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}

export function exportSleepData(history: SleepDay[]): string {
  const headers = [
    'Date', 'Day', 'Bedtime', 'Wake', 'Total (min)', 'Deep (min)', 'REM (min)',
    'Light (min)', 'Awake (min)', 'Efficiency %', 'Rating', 'Readiness', 'Sleep Fuel',
    'Lights Off (min)', 'Stress', 'HR Avg', 'HR Min', 'HR Max', 'HRV', 'SpO2',
    'Resp Rate', 'Wrist Temp', 'AHI', 'Apnea Risk', 'Tags', 'Emoji', 'Note',
  ];
  const rows = history.map(d =>
    [
      d.date, d.dayLabel, d.bedtime, d.wakeTime,
      d.totalMinutes, d.deepMinutes, d.remMinutes, d.lightMinutes, d.awakeMinutes,
      d.efficiency, d.rating, d.readiness, d.sleepFuel, d.lightsOffMinutes, d.priorDayStress,
      d.health.heartRateAvg, d.health.heartRateMin, d.health.heartRateMax,
      d.health.hrv, d.health.spo2, d.health.respRate, d.health.wristTemp,
      d.apnea.ahi, d.apnea.riskScore,
      `"${d.tags.map(t => t.label).join('; ')}"`,
      d.emoji, `"${d.note}"`,
    ].join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}
