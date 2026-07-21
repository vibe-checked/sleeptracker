import React from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import Svg, { Line, Circle, Polyline, Text as SvgText } from 'react-native-svg';
import Card from './Card';
import { getTonightBedtime, avgBedtime } from '../data/mockData';
import { useSleepData } from '../data/SleepDataContext';
import { useTheme } from '../themes/ThemeContext';

// Bedtime hour on a 20:00→28:00 (8 PM→4 AM) scale so evenings sort above
// after-midnight bedtimes.
function bedHourOf(bedtime: string): number {
  const [h, m] = bedtime.split(':').map(Number);
  return (h >= 20 ? h : h + 24) + (m || 0) / 60;
}

export default function SleepConsistency() {
  const { theme } = useTheme();
  const { sessions, goals, smartAlarm } = useSleepData();
  const tonightBedtime = getTonightBedtime(sessions, goals, smartAlarm);

  const recent = sessions.slice(-7);
  const avgBed = avgBedtime(recent);
  const { width: screenWidth } = useWindowDimensions();
  const W = Math.max(220, Math.min(screenWidth - 64, 460));

  // Timeline: 9 PM at the top, 4 AM at the bottom.
  const TOP_H = 21;
  const BOTTOM_H = 28;
  const H = 148;
  const padTop = 10;
  const padBottom = 24; // room for day labels
  const padLeft = 44; // room for hour labels
  const padRight = 12;
  const plotH = H - padTop - padBottom;
  const plotW = W - padLeft - padRight;
  const yFor = (bh: number) =>
    padTop + Math.max(0, Math.min(1, (bh - TOP_H) / (BOTTOM_H - TOP_H))) * plotH;

  const pts = recent.map((d, i) => ({
    x: padLeft + (recent.length === 1 ? plotW / 2 : (i / (recent.length - 1)) * plotW),
    y: yFor(bedHourOf(d.bedtime)),
    label: d.dayLabel,
  }));
  const gridlines = [
    { h: 22, label: '22:00' },
    { h: 24, label: '00:00' },
    { h: 26, label: '02:00' },
  ];
  const suggestedY = yFor(bedHourOf(tonightBedtime));

  return (
    <Card delay={180}>
      <Text style={{ fontSize: 11, color: theme.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '600', marginBottom: 10 }}>
        Sleep Consistency
      </Text>

      <Svg width={W} height={H}>
        {gridlines.map(g => (
          <React.Fragment key={g.h}>
            <Line x1={padLeft} y1={yFor(g.h)} x2={W - padRight} y2={yFor(g.h)} stroke={theme.cardBorder} strokeWidth={1} />
            <SvgText x={padLeft - 8} y={yFor(g.h) + 3} fill={theme.textMuted} fontSize={9} textAnchor="end">
              {g.label}
            </SvgText>
          </React.Fragment>
        ))}

        {/* Suggested bedtime — the dashed target line nights should hug */}
        <Line
          x1={padLeft}
          y1={suggestedY}
          x2={W - padRight}
          y2={suggestedY}
          stroke={theme.accent}
          strokeWidth={1.5}
          strokeDasharray="5,4"
          opacity={0.55}
        />

        {/* Drift line connecting the nightly dots */}
        {pts.length >= 2 && (
          <Polyline
            points={pts.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={theme.ring2}
            strokeWidth={1.5}
            opacity={0.45}
          />
        )}

        {pts.map((p, i) => {
          const isLast = i === pts.length - 1;
          return (
            <React.Fragment key={i}>
              <Circle cx={p.x} cy={p.y} r={isLast ? 6 : 4.5} fill={isLast ? theme.accent : theme.ring2} opacity={isLast ? 1 : 0.85} />
              <SvgText x={p.x} y={H - 8} fill={theme.textMuted} fontSize={9} textAnchor="middle">
                {p.label}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>

      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: theme.cardBorder,
      }}>
        <View>
          <Text style={{ fontSize: 10, color: theme.textMuted, letterSpacing: 0.8, textTransform: 'uppercase' }}>Avg Bedtime</Text>
          <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text, marginTop: 2 }}>
            {avgBed}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 10, color: theme.textMuted, letterSpacing: 0.8, textTransform: 'uppercase' }}>Suggested Bedtime</Text>
          <Text style={{ fontSize: 15, fontWeight: '700', color: theme.accent, marginTop: 2 }}>
            {tonightBedtime}
          </Text>
        </View>
      </View>
    </Card>
  );
}
