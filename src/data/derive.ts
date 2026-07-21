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
      return { label: 'Manual', icon: '✏️' };
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

// Sleep rating out of 100: efficiency (45), deep sleep vs the ~90-min adult
// norm (30), REM vs the ~105-min norm (25). Each component is capped so a
// genuinely great night scores ~100 and an average one lands in the 70s-80s.
export function computeRating(efficiency: number, deepMin: number, remMin: number, totalMin: number, jitter = 0): number {
  if (totalMin === 0) return 0;
  const deepScore = Math.min(deepMin / 90, 1) * 30;
  const remScore = Math.min(remMin / 105, 1) * 25;
  return Math.max(0, Math.min(100, Math.round(efficiency * 0.45 + deepScore + remScore + jitter)));
}

export function computeSleepFuel(efficiency: number, deepMin: number, remMin: number): number {
  const deepScore = Math.min(deepMin / 90, 1) * 30;
  const remScore = Math.min(remMin / 120, 1) * 30;
  return Math.min(100, Math.round(efficiency * 0.4 + deepScore + remScore));
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
  const rating = computeRating(efficiency, deepMinutes, remMinutes, totalMinutes);
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

// Average bedtime over a window, in minutes since midnight, treating evening
// hours (>=20:00) as the same night and after-midnight as the next day.
function avgBedtimeMinutes(days: SleepDay[]): number {
  const total = days.reduce((s, d) => {
    const [h, m] = d.bedtime.split(':').map(Number);
    const hh = h >= 20 ? h : h + 24; // 0–4am counts toward the prior evening
    return s + hh * 60 + (m || 0);
  }, 0);
  return total / days.length;
}

function formatClockMinutes(totalMin: number): string {
  let t = Math.round(totalMin) % (24 * 60);
  if (t < 0) t += 24 * 60;
  const h = Math.floor(t / 60) % 24;
  const m = t % 60;
  return `${h}:${m.toString().padStart(2, '0')}`;
}

// Suggested bedtime = wake-up time minus the sleep goal minus a 15-min
// wind-down buffer, so hitting it actually delivers the goal. Wake-up comes
// from the smart alarm when enabled, else the average wake time of the last
// week, else 7:00. When behind on sleep (negative bank) nudge 15-30 min
// earlier to help pay the debt back.
export function getTonightBedtime(
  history: SleepDay[],
  goals: SleepGoals,
  alarm?: { enabled: boolean; wakeHour: number; wakeMin: number }
): string {
  const recent = history.slice(-7);
  let wakeMinutes: number;
  if (alarm?.enabled) {
    wakeMinutes = alarm.wakeHour * 60 + alarm.wakeMin;
  } else if (recent.length > 0) {
    wakeMinutes =
      recent.reduce((s, d) => {
        const [h, m] = d.wakeTime.split(':').map(Number);
        return s + h * 60 + (m || 0);
      }, 0) / recent.length;
  } else {
    wakeMinutes = 7 * 60;
  }
  let bedtime = wakeMinutes - goals.sleepGoal - 15;
  const bankBalance = getSleepBank(history, goals);
  const lastBalance = bankBalance[bankBalance.length - 1] ?? 0;
  if (lastBalance < -60) bedtime -= 15; // behind on sleep → a bit earlier
  if (lastBalance < -120) bedtime -= 15;
  return formatClockMinutes(bedtime);
}

export function avgBedtime(days: SleepDay[]): string {
  if (days.length === 0) return '—';
  return formatClockMinutes(avgBedtimeMinutes(days));
}

export function exportSleepData(history: SleepDay[]): string {
  const headers = [
    'Date', 'Day', 'Bedtime', 'Wake', 'Total (min)', 'Deep (min)', 'REM (min)',
    'Light (min)', 'Awake (min)', 'Efficiency %', 'Rating', 'Readiness', 'Sleep Fuel',
    'Stress', 'HR Avg', 'HR Min', 'HR Max', 'HRV', 'SpO2',
    'Resp Rate', 'Wrist Temp', 'AHI', 'Apnea Risk', 'Tags', 'Emoji', 'Note',
  ];
  const rows = history.map(d =>
    [
      d.date, d.dayLabel, d.bedtime, d.wakeTime,
      d.totalMinutes, d.deepMinutes, d.remMinutes, d.lightMinutes, d.awakeMinutes,
      d.efficiency, d.rating, d.readiness, d.sleepFuel, d.priorDayStress,
      d.health.heartRateAvg, d.health.heartRateMin, d.health.heartRateMax,
      d.health.hrv, d.health.spo2, d.health.respRate, d.health.wristTemp,
      d.apnea.ahi, d.apnea.riskScore,
      `"${d.tags.map(t => t.label).join('; ')}"`,
      d.emoji, `"${d.note}"`,
    ].join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}
