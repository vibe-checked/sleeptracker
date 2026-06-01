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

export interface SleepDay {
  date: string;
  dayLabel: string;
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
}

const emojis = ['😴', '😊', '🥱', '💤', '😌', '🌙', '✨', '😐', '🙂', '😪'];
const notes = [
  'Felt rested',
  'Woke up once',
  'Deep sleep felt good',
  'Restless night',
  'Vivid dreams',
  'Perfect night',
  'Late caffeine',
  'Exercised before bed',
  'Stressed from work',
  'Great recovery',
  '',
  '',
  '',
  '',
];

function generateStages(bedHour: number, wakeHour: number): SleepStage[] {
  const stages: SleepStage[] = [];
  const totalHours = wakeHour > bedHour ? wakeHour - bedHour : (24 - bedHour) + wakeHour;
  const totalSlots = totalHours * 4;

  let currentStage = 0;
  let cyclePos = 0;
  const cycleLength = 24;

  for (let i = 0; i < totalSlots; i++) {
    const hour = (bedHour + Math.floor(i / 4)) % 24;
    const min = (i % 4) * 15;
    const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;

    const progress = i / totalSlots;
    cyclePos = i % cycleLength;
    const cyclePhase = cyclePos / cycleLength;

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

function countStageMinutes(stages: SleepStage[], stageNum: number): number {
  return stages.filter(s => s.stage === stageNum).length * 15;
}

function generateDay(daysAgo: number): SleepDay {
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
  const efficiency = Math.round((totalMin / (totalMin + awakeMin)) * 100);
  const rating = Math.min(100, Math.round(efficiency * 0.6 + (deepMin / totalMin) * 100 * 0.25 + Math.random() * 15));

  const lightsOffMinutes = 5 + Math.floor(Math.random() * 25);
  const priorDayStress = 20 + Math.floor(Math.random() * 60);
  const sleepFuel = Math.min(100, Math.round(efficiency * 0.4 + (deepMin / 90) * 30 + (remMin / 120) * 30));
  const readiness = Math.min(100, Math.round(
    sleepFuel * 0.4 + (100 - priorDayStress) * 0.3 + efficiency * 0.3 + (Math.random() * 10 - 5)
  ));

  return {
    date: `${monthNames[date.getMonth()]} ${date.getDate()}`,
    dayLabel: dayNames[date.getDay()],
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
    health: {
      heartRateAvg: 55 + Math.floor(Math.random() * 8),
      heartRateMin: 45 + Math.floor(Math.random() * 6),
      heartRateMax: 72 + Math.floor(Math.random() * 10),
      hrv: 35 + Math.floor(Math.random() * 25),
      spo2: 95 + Math.round(Math.random() * 3 * 10) / 10,
      respRate: 13 + Math.round(Math.random() * 4 * 10) / 10,
      wristTemp: 35.2 + Math.round(Math.random() * 1.5 * 10) / 10,
    },
    readiness,
    sleepFuel,
    lightsOffMinutes,
    priorDayStress,
    emoji: emojis[Math.floor(Math.random() * emojis.length)],
    note: notes[Math.floor(Math.random() * notes.length)],
  };
}

export const sleepHistory: SleepDay[] = Array.from({ length: 14 }, (_, i) => generateDay(13 - i));

export const today = sleepHistory[sleepHistory.length - 1];

export const sleepGoal = 480;
export const deepGoal = 90;
export const qualityGoal = 85;

export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m`;
}

export function getSleepBank(history: SleepDay[]): number[] {
  let balance = 0;
  return history.slice(-7).map(d => {
    balance += d.totalMinutes - sleepGoal;
    return balance;
  });
}

export function getTonightBedtime(history: SleepDay[]): string {
  const recent = history.slice(-7);
  const avgBedHour = recent.reduce((s, d) => {
    const [h] = d.bedtime.split(':').map(Number);
    return s + (h >= 20 ? h : h + 24);
  }, 0) / recent.length;
  const bankBalance = getSleepBank(history);
  const lastBalance = bankBalance[bankBalance.length - 1];
  let adjustedHour = avgBedHour;
  if (lastBalance < -60) adjustedHour -= 0.5;
  if (lastBalance < -120) adjustedHour -= 0.5;
  const h = Math.round(adjustedHour) % 24;
  const m = Math.round((adjustedHour % 1) * 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}

export function exportSleepData(history: SleepDay[]): string {
  const headers = ['Date', 'Day', 'Bedtime', 'Wake', 'Total (min)', 'Deep (min)', 'REM (min)', 'Light (min)', 'Awake (min)', 'Efficiency %', 'Rating', 'Readiness', 'Sleep Fuel', 'Lights Off (min)', 'Stress', 'HR Avg', 'HR Min', 'HR Max', 'HRV', 'SpO2', 'Resp Rate', 'Wrist Temp', 'Emoji', 'Note'];
  const rows = history.map(d => [
    d.date, d.dayLabel, d.bedtime, d.wakeTime,
    d.totalMinutes, d.deepMinutes, d.remMinutes, d.lightMinutes, d.awakeMinutes,
    d.efficiency, d.rating, d.readiness, d.sleepFuel, d.lightsOffMinutes, d.priorDayStress,
    d.health.heartRateAvg, d.health.heartRateMin, d.health.heartRateMax,
    d.health.hrv, d.health.spo2, d.health.respRate, d.health.wristTemp,
    d.emoji, `"${d.note}"`,
  ].join(','));
  return [headers.join(','), ...rows].join('\n');
}
