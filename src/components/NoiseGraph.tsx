import React from 'react';
import { View } from 'react-native';
import Svg, { Polyline, Line, Text as SvgText, Defs, LinearGradient as SvgGradient, Stop, Polygon } from 'react-native-svg';
import type { NoiseSample } from '../data/types';
import type { Theme } from '../themes/themes';

interface Props {
  samples: NoiseSample[];
  width: number;
  height?: number;
  theme: Theme;
}

// Environmental noise (dB) across the night as a filled area line.
export default function NoiseGraph({ samples, width, height = 130, theme }: Props) {
  const padLeft = 38;
  const padBottom = 22;
  const padTop = 10;
  const plotW = width - padLeft - 10;
  const plotH = height - padTop - padBottom;

  if (samples.length === 0) return <View style={{ height }} />;

  const dbs = samples.map(s => s.db);
  const minDb = Math.floor(Math.min(...dbs) - 2);
  const maxDb = Math.ceil(Math.max(...dbs) + 2);
  const range = Math.max(1, maxDb - minDb);

  const xFor = (i: number) => padLeft + (i / Math.max(1, samples.length - 1)) * plotW;
  const yFor = (db: number) => padTop + (1 - (db - minDb) / range) * plotH;

  const points = samples.map((s, i) => `${xFor(i)},${yFor(s.db)}`).join(' ');
  const areaPoints = `${padLeft},${padTop + plotH} ${points} ${xFor(samples.length - 1)},${padTop + plotH}`;

  const tickEvery = Math.max(1, Math.floor(samples.length / 5));

  return (
    <Svg width={width} height={height}>
      <Defs>
        <SvgGradient id="noiseFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={theme.ring2} stopOpacity={0.35} />
          <Stop offset="1" stopColor={theme.ring2} stopOpacity={0.02} />
        </SvgGradient>
      </Defs>
      {[0, 0.5, 1].map(frac => {
        const y = padTop + frac * plotH;
        const db = Math.round(maxDb - frac * range);
        return (
          <React.Fragment key={frac}>
            <Line x1={padLeft} y1={y} x2={padLeft + plotW} y2={y} stroke={theme.cardBorder} strokeDasharray="3,3" strokeOpacity={0.5} />
            <SvgText x={padLeft - 5} y={y + 3} fill={theme.textMuted} fontSize={9} textAnchor="end">{db}</SvgText>
          </React.Fragment>
        );
      })}
      <Polygon points={areaPoints} fill="url(#noiseFill)" />
      <Polyline points={points} fill="none" stroke={theme.ring2} strokeWidth={1.5} />
      {samples.map((s, i) =>
        i % tickEvery === 0 ? (
          <SvgText key={i} x={xFor(i)} y={height - 5} fill={theme.textMuted} fontSize={8} textAnchor="middle">{s.time}</SvgText>
        ) : null
      )}
    </Svg>
  );
}
