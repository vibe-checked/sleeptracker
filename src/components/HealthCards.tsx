import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import type { HealthMetrics } from '../data/mockData';
import { useTheme } from '../themes/ThemeContext';

interface MetricProps {
  label: string;
  value: string;
  unit: string;
  sub?: string;
  color: string;
  icon: string;
  delay: number;
}

function MetricCard({ label, value, unit, sub, color, icon, delay }: MetricProps) {
  const { theme } = useTheme();

  return (
    <Animated.View
      entering={FadeInUp.delay(delay).duration(500)}
      style={{
        backgroundColor: theme.cardBg,
        borderColor: theme.cardBorder,
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        width: '48%',
        marginBottom: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Text style={{ fontSize: 14 }}>{icon}</Text>
        <Text style={{ fontSize: 10, color: theme.textMuted, letterSpacing: 1, textTransform: 'uppercase', fontWeight: '600' }}>
          {label}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
        <Text style={{ fontSize: 26, fontWeight: '700', color }}>{value}</Text>
        <Text style={{ fontSize: 11, color: theme.textDim }}>{unit}</Text>
      </View>
      {sub && <Text style={{ fontSize: 10, color: theme.textMuted, marginTop: 3 }}>{sub}</Text>}
    </Animated.View>
  );
}

interface Props {
  health: HealthMetrics;
}

export default function HealthCards({ health }: Props) {
  const { theme } = useTheme();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
      <MetricCard label="Heart Rate" value={String(health.heartRateAvg)} unit="bpm avg" sub={`${health.heartRateMin}–${health.heartRateMax} bpm`} color={theme.hrColor} icon="♥" delay={100} />
      <MetricCard label="SpO2" value={health.spo2.toFixed(1)} unit="%" sub="Blood oxygen" color={theme.ring1} icon="◉" delay={200} />
      <MetricCard label="HRV" value={String(health.hrv)} unit="ms" sub="Heart rate variability" color={theme.ring2} icon="⟡" delay={300} />
      <MetricCard label="Respiration" value={health.respRate.toFixed(1)} unit="br/min" sub="Breathing rate" color={theme.ring3} icon="⊚" delay={400} />
      <MetricCard label="Wrist Temp" value={health.wristTemp > 0 ? health.wristTemp.toFixed(1) : '—'} unit={health.wristTemp > 0 ? '°C' : ''} sub={health.wristTemp > 0 ? 'Skin temperature' : 'Needs Series 8+'} color={theme.accent} icon="◈" delay={500} />
    </View>
  );
}
