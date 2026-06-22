import React from 'react';
import { View } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import type { SnoringSample } from '../data/types';
import type { Theme } from '../themes/themes';

interface Props {
  samples: SnoringSample[];
  width: number;
  height?: number;
  theme: Theme;
}

// Snoring intensity (0-100) across the night as vertical bars; most slots are 0.
export default function SnoringGraph({ samples, width, height = 120, theme }: Props) {
  const padLeft = 30;
  const padBottom = 22;
  const padTop = 10;
  const plotW = width - padLeft - 10;
  const plotH = height - padTop - padBottom;

  if (samples.length === 0) return <View style={{ height }} />;

  const slotW = plotW / samples.length;
  const barW = Math.max(1.5, slotW * 0.7);
  const tickEvery = Math.max(1, Math.floor(samples.length / 5));

  return (
    <Svg width={width} height={height}>
      {[0, 0.5, 1].map(frac => {
        const y = padTop + frac * plotH;
        return (
          <React.Fragment key={frac}>
            <Line x1={padLeft} y1={y} x2={padLeft + plotW} y2={y} stroke={theme.cardBorder} strokeDasharray="3,3" strokeOpacity={0.5} />
            <SvgText x={padLeft - 5} y={y + 3} fill={theme.textMuted} fontSize={9} textAnchor="end">{Math.round(100 - frac * 100)}</SvgText>
          </React.Fragment>
        );
      })}
      {samples.map((s, i) => {
        if (s.intensity <= 0) return null;
        const h = (s.intensity / 100) * plotH;
        const x = padLeft + i * slotW + (slotW - barW) / 2;
        const y = padTop + plotH - h;
        const color = s.intensity > 66 ? theme.negative : s.intensity > 33 ? theme.ring3 : theme.accent;
        return <Rect key={i} x={x} y={y} width={barW} height={h} fill={color} fillOpacity={0.8} rx={1} />;
      })}
      {samples.map((s, i) =>
        i % tickEvery === 0 ? (
          <SvgText key={`t${i}`} x={padLeft + i * slotW + barW / 2} y={height - 5} fill={theme.textMuted} fontSize={8} textAnchor="middle">{s.time}</SvgText>
        ) : null
      )}
    </Svg>
  );
}
