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

  // A metric value of 0 means the sensor wasn't available (e.g. iPhone-only
  // tracking has no heart rate); show it as "—" rather than a fake zero.
  const hasHR = health.heartRateAvg > 0;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
      <MetricCard label="Heart Rate" value={hasHR ? String(health.heartRateAvg) : '—'} unit={hasHR ? 'bpm avg' : ''} sub={hasHR ? `${health.heartRateMin}–${health.heartRateMax} bpm` : 'Needs Apple Watch'} color={theme.hrColor} icon="♥" delay={100} />
      <MetricCard label="SpO2" value={health.spo2 > 0 ? health.spo2.toFixed(1) : '—'} unit={health.spo2 > 0 ? '%' : ''} sub={health.spo2 > 0 ? 'Blood oxygen' : 'Needs Apple Watch'} color={theme.ring1} icon="◉" delay={200} />
      <MetricCard label="HRV" value={health.hrv > 0 ? String(health.hrv) : '—'} unit={health.hrv > 0 ? 'ms' : ''} sub={health.hrv > 0 ? 'Heart rate variability' : 'Needs Apple Watch'} color={theme.ring2} icon="⟡" delay={300} />
      <MetricCard label="Respiration" value={health.respRate > 0 ? health.respRate.toFixed(1) : '—'} unit={health.respRate > 0 ? 'br/min' : ''} sub={health.respRate > 0 ? 'Breathing rate' : 'Needs Apple Watch'} color={theme.ring3} icon="⊚" delay={400} />
      <MetricCard label="Wrist Temp" value={health.wristTemp > 0 ? health.wristTemp.toFixed(1) : '—'} unit={health.wristTemp > 0 ? '°C' : ''} sub={health.wristTemp > 0 ? 'Skin temperature' : 'Needs Series 8+'} color={theme.accent} icon="◈" delay={500} />
    </View>
  );
}
