import React from 'react';
import { View } from 'react-native';
import Svg, { Polyline, Polygon, Line, Circle, Text as SvgText, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import type { Theme } from '../themes/themes';

interface Props {
  values: number[];
  labels?: string[];
  width: number;
  height?: number;
  theme: Theme;
  color?: string;
  unitLabel?: (v: number) => string;
}

// Long-term trend line with a soft gradient fill. Auto-scales to the data.
export default function LineChart({ values, labels, width, height = 160, theme, color, unitLabel }: Props) {
  const stroke = color ?? theme.accent;
  const padLeft = 36;
  const padBottom = 22;
  const padTop = 12;
  const plotW = width - padLeft - 10;
  const plotH = height - padTop - padBottom;

  if (values.length === 0) return <View style={{ height }} />;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const lo = min === max ? min - 1 : min;
  const hi = min === max ? max + 1 : max;
  const range = hi - lo;

  const xFor = (i: number) => padLeft + (i / Math.max(1, values.length - 1)) * plotW;
  const yFor = (v: number) => padTop + (1 - (v - lo) / range) * plotH;

  const pts = values.map((v, i) => `${xFor(i)},${yFor(v)}`).join(' ');
  const area = `${padLeft},${padTop + plotH} ${pts} ${xFor(values.length - 1)},${padTop + plotH}`;
  const fmt = unitLabel ?? ((v: number) => `${Math.round(v)}`);
  const tickEvery = Math.max(1, Math.floor(values.length / 6));

  return (
    <Svg width={width} height={height}>
      <Defs>
        <SvgGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={stroke} stopOpacity={0.3} />
          <Stop offset="1" stopColor={stroke} stopOpacity={0.02} />
        </SvgGradient>
      </Defs>
      {[0, 0.5, 1].map(frac => {
        const y = padTop + frac * plotH;
        return (
          <React.Fragment key={frac}>
            <Line x1={padLeft} y1={y} x2={padLeft + plotW} y2={y} stroke={theme.cardBorder} strokeDasharray="3,3" strokeOpacity={0.5} />
            <SvgText x={padLeft - 5} y={y + 3} fill={theme.textMuted} fontSize={9} textAnchor="end">{fmt(hi - frac * range)}</SvgText>
          </React.Fragment>
        );
      })}
      <Polygon points={area} fill="url(#lineFill)" />
      <Polyline points={pts} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" />
      {values.map((v, i) => (
        <Circle key={i} cx={xFor(i)} cy={yFor(v)} r={1.6} fill={stroke} />
      ))}
      {labels &&
        labels.map((l, i) =>
          i % tickEvery === 0 ? (
            <SvgText key={i} x={xFor(i)} y={height - 5} fill={theme.textMuted} fontSize={8} textAnchor="middle">{l}</SvgText>
          ) : null
        )}
    </Svg>
  );
}
