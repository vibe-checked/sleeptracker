import React from 'react';
import { View } from 'react-native';
import Svg, { Rect, Line, Circle, Text as SvgText } from 'react-native-svg';
import type { ApneaData } from '../data/types';
import type { Theme } from '../themes/themes';

interface Props {
  apnea: ApneaData;
  times: string[]; // stage slot times, for the x-axis range
  width: number;
  height?: number;
  theme: Theme;
}

// Discrete apnea events plotted along the night timeline, height = severity.
export default function ApneaTimeline({ apnea, times, width, height = 90, theme }: Props) {
  const padLeft = 12;
  const padBottom = 20;
  const padTop = 8;
  const plotW = width - padLeft - 10;
  const plotH = height - padTop - padBottom;

  if (times.length === 0) return <View style={{ height }} />;

  const indexOfTime = (t: string) => {
    const i = times.indexOf(t);
    return i >= 0 ? i : 0;
  };
  const xFor = (i: number) => padLeft + (i / Math.max(1, times.length - 1)) * plotW;
  const baseY = padTop + plotH;
  const tickEvery = Math.max(1, Math.floor(times.length / 5));

  return (
    <Svg width={width} height={height}>
      <Line x1={padLeft} y1={baseY} x2={padLeft + plotW} y2={baseY} stroke={theme.cardBorder} strokeOpacity={0.6} />
      {apnea.events.length === 0 && (
        <SvgText x={width / 2} y={padTop + plotH / 2} fill={theme.textMuted} fontSize={11} textAnchor="middle">
          No events detected
        </SvgText>
      )}
      {apnea.events.map((e, j) => {
        const x = xFor(indexOfTime(e.time));
        const h = (e.severity / 100) * plotH;
        const color = e.severity > 66 ? theme.negative : e.severity > 33 ? theme.ring3 : theme.accent;
        return (
          <React.Fragment key={j}>
            <Rect x={x - 1} y={baseY - h} width={2.5} height={h} fill={color} fillOpacity={0.85} rx={1} />
            <Circle cx={x} cy={baseY - h} r={2.5} fill={color} />
          </React.Fragment>
        );
      })}
      {times.map((t, i) =>
        i % tickEvery === 0 ? (
          <SvgText key={i} x={xFor(i)} y={height - 5} fill={theme.textMuted} fontSize={8} textAnchor="middle">{t}</SvgText>
        ) : null
      )}
    </Svg>
  );
}
