import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import type { Theme } from '../themes/themes';

interface BarData {
  label: string;
  segments?: { value: number; color: string }[];
  value?: number;
  color?: string;
}

interface Props {
  data: BarData[];
  width: number;
  height: number;
  theme: Theme;
  stacked?: boolean;
}

export default function BarChart({ data, width, height, theme, stacked = false }: Props) {
  const padLeft = 35;
  const padBottom = 25;
  const padTop = 10;
  const plotW = width - padLeft - 10;
  const plotH = height - padTop - padBottom;

  let maxVal = 0;
  if (stacked) {
    maxVal = Math.max(...data.map(d => (d.segments || []).reduce((s, seg) => s + seg.value, 0)));
  } else {
    maxVal = Math.max(...data.map(d => Math.abs(d.value || 0)));
  }
  if (maxVal === 0) maxVal = 1;

  const hasNegative = !stacked && data.some(d => (d.value || 0) < 0);
  const slotW = plotW / Math.max(data.length, 1);
  const barWidth = Math.max(4, slotW * 0.6);
  const gap = slotW * 0.4;

  return (
    <Svg width={width} height={height}>
      {/* Y axis ticks */}
      {[0, 0.5, 1].map(frac => {
        const y = padTop + (1 - frac) * plotH;
        const val = hasNegative ? Math.round(-maxVal + frac * maxVal * 2) : Math.round(frac * maxVal);
        return (
          <React.Fragment key={frac}>
            <Line x1={padLeft} y1={y} x2={padLeft + plotW} y2={y} stroke={theme.cardBorder} strokeDasharray="3,3" strokeOpacity={0.5} />
            <SvgText x={padLeft - 5} y={y + 3} fill={theme.textMuted} fontSize={9} textAnchor="end">
              {val}
            </SvgText>
          </React.Fragment>
        );
      })}

      {hasNegative && (
        <Line x1={padLeft} y1={padTop + plotH / 2} x2={padLeft + plotW} y2={padTop + plotH / 2} stroke={theme.textMuted} strokeDasharray="4,4" strokeOpacity={0.4} />
      )}

      {data.map((d, i) => {
        const x = padLeft + i * (plotW / data.length) + gap / 2;

        if (stacked && d.segments) {
          let cumY = 0;
          const total = d.segments.reduce((s, seg) => s + seg.value, 0);
          return (
            <React.Fragment key={i}>
              {d.segments.map((seg, j) => {
                const segH = (seg.value / maxVal) * plotH;
                cumY += segH;
                const y = padTop + plotH - cumY;
                return (
                  <Rect
                    key={j}
                    x={x}
                    y={y}
                    width={barWidth}
                    height={segH}
                    fill={seg.color}
                    rx={j === d.segments!.length - 1 ? 3 : 0}
                  />
                );
              })}
              <SvgText x={x + barWidth / 2} y={height - 5} fill={theme.textMuted} fontSize={8} textAnchor="middle">
                {d.label}
              </SvgText>
            </React.Fragment>
          );
        }

        const val = d.value || 0;
        const color = d.color || theme.accent;

        if (hasNegative) {
          const zeroY = padTop + plotH / 2;
          const barH = (Math.abs(val) / maxVal) * (plotH / 2);
          const y = val >= 0 ? zeroY - barH : zeroY;
          return (
            <React.Fragment key={i}>
              <Rect x={x} y={y} width={barWidth} height={barH} fill={color} fillOpacity={0.85} rx={3} />
              <SvgText x={x + barWidth / 2} y={height - 5} fill={theme.textMuted} fontSize={8} textAnchor="middle">
                {d.label}
              </SvgText>
            </React.Fragment>
          );
        }

        const barH = (val / maxVal) * plotH;
        const y = padTop + plotH - barH;
        return (
          <React.Fragment key={i}>
            <Rect x={x} y={y} width={barWidth} height={barH} fill={color} fillOpacity={0.75} rx={3} />
            <SvgText x={x + barWidth / 2} y={height - 5} fill={theme.textMuted} fontSize={8} textAnchor="middle">
              {d.label}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}
