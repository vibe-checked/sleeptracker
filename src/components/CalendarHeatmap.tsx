import React from 'react';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import type { SleepDay } from '../data/types';
import type { Theme } from '../themes/themes';

interface Props {
  sessions: SleepDay[];
  width: number;
  theme: Theme;
}

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// GitHub-style contribution grid: one cell per night, columns = weeks, rows =
// weekday, colored by sleep rating.
export default function CalendarHeatmap({ sessions, width, theme }: Props) {
  if (sessions.length === 0) return null;

  const colorFor = (rating: number) => {
    if (rating >= 85) return theme.positive;
    if (rating >= 70) return theme.accent;
    if (rating >= 55) return theme.ring3;
    return theme.negative;
  };

  // Map each session to (week, weekday) relative to the Sunday on/before the
  // first session's date.
  const parse = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const first = parse(sessions[0].isoDate);
  const firstSunday = new Date(first);
  firstSunday.setDate(first.getDate() - first.getDay());
  const dayMs = 24 * 60 * 60 * 1000;

  const cells = sessions.map(s => {
    const dt = parse(s.isoDate);
    const diffDays = Math.round((dt.getTime() - firstSunday.getTime()) / dayMs);
    return { week: Math.floor(diffDays / 7), dow: dt.getDay(), rating: s.rating };
  });
  const weeks = Math.max(...cells.map(c => c.week)) + 1;

  const labelW = 16;
  const gap = 3;
  const cell = Math.max(8, Math.min(20, (width - labelW - gap * (weeks - 1)) / weeks - gap));
  const gridW = labelW + weeks * (cell + gap);
  const gridH = 7 * (cell + gap) + 4;

  return (
    <Svg width={gridW} height={gridH}>
      {DOW.map((d, i) => (
        <SvgText key={i} x={0} y={i * (cell + gap) + cell - 1} fill={theme.textMuted} fontSize={8}>{d}</SvgText>
      ))}
      {cells.map((c, i) => (
        <Rect
          key={i}
          x={labelW + c.week * (cell + gap)}
          y={c.dow * (cell + gap)}
          width={cell}
          height={cell}
          rx={2}
          fill={colorFor(c.rating)}
          fillOpacity={0.25 + (c.rating / 100) * 0.75}
        />
      ))}
    </Svg>
  );
}
