import React from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import Svg, { Rect, Line, Polyline, Text as SvgText } from 'react-native-svg';
import type { SleepStage } from '../data/types';
import type { Theme } from '../themes/themes';

interface Props {
  stages: SleepStage[];
  theme: Theme;
  width?: number;
}

const stageLabels = ['Deep', 'Light', 'REM', 'Awake'];
const stageYMap: Record<number, number> = { 0: 0.1, 1: 0.35, 2: 0.65, 3: 0.9 };

export default function SleepStageGraph({ stages, theme, width: propWidth }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = Math.max(200, Math.min(propWidth || screenWidth - 56, 500));
  const chartHeight = 180;
  const padLeft = 45;
  const padBottom = 25;
  const padTop = 10;
  const plotW = chartWidth - padLeft - 10;
  const plotH = chartHeight - padTop - padBottom;

  const stagePoints = stages.map((s, i) => {
    const x = padLeft + (i / (stages.length - 1)) * plotW;
    const yNorm = stageYMap[3 - s.stage];
    const y = padTop + yNorm * plotH;
    return `${x},${y}`;
  }).join(' ');

  const hrMin = Math.min(...stages.map(s => s.heartRate)) - 3;
  const hrMax = Math.max(...stages.map(s => s.heartRate)) + 3;
  const hrPoints = stages.map((s, i) => {
    const x = padLeft + (i / (stages.length - 1)) * plotW;
    const y = padTop + ((hrMax - s.heartRate) / (hrMax - hrMin)) * plotH;
    return `${x},${y}`;
  }).join(' ');

  const tickInterval = Math.floor(stages.length / 5);
  const xTicks = stages
    .map((s, i) => (i % tickInterval === 0 ? { i, time: s.time } : null))
    .filter(Boolean) as { i: number; time: string }[];

  return (
    <View>
      <Svg width={chartWidth} height={chartHeight}>
        {/* Grid lines */}
        {[0, 1, 2, 3].map(i => {
          const y = padTop + (i / 3) * plotH;
          return (
            <React.Fragment key={i}>
              <Line x1={padLeft} y1={y} x2={padLeft + plotW} y2={y} stroke={theme.cardBorder} strokeDasharray="3,3" />
              <SvgText x={padLeft - 5} y={y + 4} fill={theme.textDim} fontSize={9} textAnchor="end">
                {stageLabels[i]}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* X axis labels */}
        {xTicks.map(t => {
          const x = padLeft + (t.i / (stages.length - 1)) * plotW;
          return (
            <SvgText key={t.i} x={x} y={chartHeight - 5} fill={theme.textMuted} fontSize={9} textAnchor="middle">
              {t.time}
            </SvgText>
          );
        })}

        {/* Stage area (step) */}
        <Polyline
          points={stagePoints}
          fill="none"
          stroke={theme.accent}
          strokeWidth={2}
          strokeOpacity={0.7}
        />

        {/* Filled rectangles for stages */}
        {stages.map((s, i) => {
          if (i >= stages.length - 1) return null;
          const x = padLeft + (i / (stages.length - 1)) * plotW;
          const nextX = padLeft + ((i + 1) / (stages.length - 1)) * plotW;
          const yNorm = stageYMap[3 - s.stage];
          const y = padTop + yNorm * plotH;
          const colors: Record<number, string> = { 0: theme.awakeColor, 1: theme.remColor, 2: theme.lightColor, 3: theme.deepColor };
          const rectWidth = Math.max(0.5, nextX - x);
          return (
            <Rect
              key={i}
              x={x}
              y={y}
              width={rectWidth}
              height={padTop + plotH - y}
              fill={colors[s.stage]}
              fillOpacity={0.12}
            />
          );
        })}

        {/* HR line */}
        <Polyline
          points={hrPoints}
          fill="none"
          stroke={theme.hrColor}
          strokeWidth={1.5}
          strokeOpacity={0.5}
        />
      </Svg>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 6 }}>
        {[
          { label: 'Awake', color: theme.awakeColor },
          { label: 'REM', color: theme.remColor },
          { label: 'Light', color: theme.lightColor },
          { label: 'Deep', color: theme.deepColor },
          { label: 'HR', color: theme.hrColor, line: true },
        ].map(item => (
          <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {item.line ? (
              <View style={{ width: 12, height: 2, backgroundColor: item.color, borderRadius: 1 }} />
            ) : (
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: item.color }} />
            )}
            <Text style={{ fontSize: 10, color: theme.textDim }}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
