// Pure derivation + utility functions. No randomness, no I/O.
// Used by the mock generator AND by the edit flow (recompute on change).

import type { SleepDay, SleepStage, SleepGoals, SleepSource } from './types';

// Human label + icon for where a night's data came from.
export function sourceLabel(source: SleepSource): { label: string; icon: string } {
  switch (source) {
    case 'healthkit':
      return { label: 'Apple Watch', icon: '⌚' };
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

export function computeReadiness(
  sleepFuel: number,
  priorDayStress: number,
  efficiency: number,
  jitter = 0
): number {
  return Math.max(
    0,
    Math.min(100, Math.round(sleepFuel * 0.4 + (100 - priorDayStress) * 0.3 + efficiency * 0.3 + jitter))
  );
}

// Recompute every derived metric from the primitive fields (stages, stress, etc.).
// Called after a user edits bed/wake times, tags, or notes so the card values stay
// consistent. Deterministic: no jitter is applied on recompute.
export function recomputeDerived(day: SleepDay): SleepDay {
  const deepMinutes = countStageMinutes(day.stages, 3);
  const remMinutes = countStageMinutes(day.stages, 1);
  const lightMinutes = countStageMinutes(day.stages, 2);
  const awakeMinutes = countStageMinutes(day.stages, 0);
  const totalMinutes = deepMinutes + remMinutes + lightMinutes;
  const efficiency = computeEfficiency(totalMinutes, awakeMinutes);
  const rating = computeRating(efficiency, deepMinutes, totalMinutes);
  const sleepFuel = computeSleepFuel(efficiency, deepMinutes, remMinutes);
  const readiness = computeReadiness(sleepFuel, day.priorDayStress, efficiency);

  return {
    ...day,
    deepMinutes,
    remMinutes,
    lightMinutes,
    awakeMinutes,
    totalMinutes,
    efficiency,
    rating,
    sleepFuel,
    readiness,
  };
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
