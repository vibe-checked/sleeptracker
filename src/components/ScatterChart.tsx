import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import type { Theme } from '../themes/themes';

interface Props {
  points: { x: number; y: number }[];
  width: number;
  height?: number;
  theme: Theme;
  xLabel?: string;
  yLabel?: string;
  color?: string;
}

// Scatter plot with a simple least-squares trend line, for correlations.
export default function ScatterChart({ points, width, height = 180, theme, xLabel, yLabel, color }: Props) {
  const dot = color ?? theme.accent;
  const padLeft = 36;
  const padBottom = 28;
  const padTop = 12;
  const plotW = width - padLeft - 12;
  const plotH = height - padTop - padBottom;

  if (points.length === 0) return <View style={{ height }} />;

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys), yMax = Math.max(...ys);
  const xRange = xMax === xMin ? 1 : xMax - xMin;
  const yRange = yMax === yMin ? 1 : yMax - yMin;

  const sx = (x: number) => padLeft + ((x - xMin) / xRange) * plotW;
  const sy = (y: number) => padTop + (1 - (y - yMin) / yRange) * plotH;

  // Least-squares fit y = a + b x.
  const n = points.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  const b = den === 0 ? 0 : num / den;
  const a = my - b * mx;
  const lineY1 = a + b * xMin;
  const lineY2 = a + b * xMax;

  return (
    <Svg width={width} height={height}>
      {[0, 0.5, 1].map(frac => {
        const y = padTop + frac * plotH;
        return <Line key={frac} x1={padLeft} y1={y} x2={padLeft + plotW} y2={y} stroke={theme.cardBorder} strokeDasharray="3,3" strokeOpacity={0.4} />;
      })}
      <SvgText x={padLeft - 5} y={padTop + 4} fill={theme.textMuted} fontSize={9} textAnchor="end">{Math.round(yMax)}</SvgText>
      <SvgText x={padLeft - 5} y={padTop + plotH} fill={theme.textMuted} fontSize={9} textAnchor="end">{Math.round(yMin)}</SvgText>
      <Line x1={sx(xMin)} y1={sy(lineY1)} x2={sx(xMax)} y2={sy(lineY2)} stroke={dot} strokeWidth={1.5} strokeOpacity={0.5} strokeDasharray="5,4" />
      {points.map((p, i) => (
        <Circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={3.2} fill={dot} fillOpacity={0.7} />
      ))}
      {yLabel && (
        <SvgText x={padLeft} y={height - 4} fill={theme.textMuted} fontSize={8} textAnchor="start">{xLabel}</SvgText>
      )}
      {yLabel && (
        <SvgText x={padLeft + plotW} y={height - 4} fill={theme.textMuted} fontSize={8} textAnchor="end">{yLabel} ↑</SvgText>
      )}
    </Svg>
  );
}
