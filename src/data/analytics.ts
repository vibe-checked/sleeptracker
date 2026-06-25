import type { SleepDay, SleepTag } from './types';

export interface TagInsight {
  tag: SleepTag;
  count: number;
  withAvg: number;
  withoutAvg: number;
  delta: number; // withAvg - withoutAvg (rating points)
}

// Pearson correlation coefficient of two equal-length series. Returns 0 for
// degenerate input.
export function correlate(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  if (dx === 0 || dy === 0) return 0;
  return num / Math.sqrt(dx * dy);
}

export function bestWorst(sessions: SleepDay[]): { best: SleepDay | null; worst: SleepDay | null } {
  if (sessions.length === 0) return { best: null, worst: null };
  let best = sessions[0];
  let worst = sessions[0];
  for (const s of sessions) {
    if (s.rating > best.rating) best = s;
    if (s.rating < worst.rating) worst = s;
  }
  return { best, worst };
}

// Average rating on nights a tag is present vs absent. Only tags used at least
// twice are returned, sorted by absolute impact.
export function tagVsRating(sessions: SleepDay[]): TagInsight[] {
  const byTag = new Map<string, { tag: SleepTag; withVals: number[]; withoutVals: number[] }>();
  // Seed the universe of tags actually used.
  for (const s of sessions) {
    for (const t of s.tags) {
      if (!byTag.has(t.id)) byTag.set(t.id, { tag: t, withVals: [], withoutVals: [] });
    }
  }
  for (const s of sessions) {
    const ids = new Set(s.tags.map(t => t.id));
    byTag.forEach((entry, id) => {
      if (ids.has(id)) entry.withVals.push(s.rating);
      else entry.withoutVals.push(s.rating);
    });
  }
  const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const insights: TagInsight[] = [];
  byTag.forEach(entry => {
    if (entry.withVals.length < 2) return;
    const withAvg = Math.round(avg(entry.withVals));
    const withoutAvg = Math.round(avg(entry.withoutVals));
    insights.push({
      tag: entry.tag,
      count: entry.withVals.length,
      withAvg,
      withoutAvg,
      delta: withAvg - withoutAvg,
    });
  });
  return insights.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

export interface Bucket {
  label: string;
  count: number;
}

// Histogram of values into fixed-width bins between min and max.
export function bucketize(values: number[], binCount: number, min: number, max: number): Bucket[] {
  const buckets: Bucket[] = [];
  const width = (max - min) / binCount;
  for (let i = 0; i < binCount; i++) {
    const lo = min + i * width;
    const hi = lo + width;
    buckets.push({ label: `${Math.round(lo)}`, count: 0 });
    for (const v of values) {
      if (v >= lo && (i === binCount - 1 ? v <= hi : v < hi)) buckets[i].count++;
    }
  }
  return buckets;
}

// Average of a numeric field across a slice of sessions.
export function avgField(sessions: SleepDay[], pick: (d: SleepDay) => number): number {
  if (sessions.length === 0) return 0;
  return sessions.reduce((s, d) => s + pick(d), 0) / sessions.length;
}

export interface PeriodComparison {
  label: string;
  recent: number;
  prior: number;
  delta: number;
  unit: string;
}

// This-week vs prior-week averages for the headline metrics.
export function periodComparisons(sessions: SleepDay[]): PeriodComparison[] {
  const recent = sessions.slice(-7);
  const prior = sessions.slice(-14, -7);
  const metrics: { label: string; pick: (d: SleepDay) => number; unit: string }[] = [
    { label: 'Sleep', pick: d => d.totalMinutes, unit: 'min' },
    { label: 'Rating', pick: d => d.rating, unit: '%' },
    { label: 'Deep', pick: d => d.deepMinutes, unit: 'min' },
    { label: 'Readiness', pick: d => d.readiness, unit: '' },
    { label: 'Efficiency', pick: d => d.efficiency, unit: '%' },
    { label: 'AHI', pick: d => d.apnea.ahi, unit: '' },
  ];
  const hasPrior = prior.length > 0;
  return metrics.map(m => {
    const r = Math.round(avgField(recent, m.pick) * 10) / 10;
    const p = Math.round(avgField(prior, m.pick) * 10) / 10;
    // No prior week yet → flat delta instead of a misleading r−0 jump.
    return { label: m.label, recent: r, prior: p, delta: hasPrior ? Math.round((r - p) * 10) / 10 : 0, unit: m.unit };
  });
}
