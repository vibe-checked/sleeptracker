import React from 'react';
import { View, Text } from 'react-native';
import Card from './Card';
import GaugeRing from './GaugeRing';
import { useTheme } from '../themes/ThemeContext';

interface Props {
  readiness: number;
  sleepFuel: number;
  recovery: number;
  restingHr: number;
  awakeMin: number;
}

export default function ReadinessCard({ readiness, sleepFuel, recovery, restingHr, awakeMin }: Props) {
  const { theme } = useTheme();
  const label = readiness >= 80 ? 'Excellent' : readiness >= 60 ? 'Good' : readiness >= 40 ? 'Fair' : 'Low';
  const color = readiness >= 80 ? theme.positive : readiness >= 60 ? theme.accent : readiness >= 40 ? theme.ring2 : theme.negative;

  return (
    <Card delay={150}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <View>
          <Text style={{ fontSize: 11, color: theme.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '600' }}>
            Today's Readiness
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
            <Text style={{ fontSize: 32, fontWeight: '700', color }}>{readiness}</Text>
            <Text style={{ fontSize: 13, color, fontWeight: '600' }}>{label}</Text>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 14 }}>
        <GaugeRing value={sleepFuel} size={70} color={theme.ring1} label="Sleep Fuel" />
        <GaugeRing value={recovery} size={70} color={theme.ring3} label="Recovery" />
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1, backgroundColor: theme.accentDim, borderRadius: 12, padding: 10 }}>
          <Text style={{ fontSize: 10, color: theme.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2 }}>
            Awake
          </Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text }}>
            {awakeMin}<Text style={{ fontSize: 12, color: theme.textDim, fontWeight: '400' }}> min</Text>
          </Text>
        </View>
        <View style={{ flex: 1, backgroundColor: theme.accentDim, borderRadius: 12, padding: 10 }}>
          <Text style={{ fontSize: 10, color: theme.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2 }}>
            Resting HR
          </Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text }}>
            {restingHr > 0 ? restingHr : '—'}<Text style={{ fontSize: 12, color: theme.textDim, fontWeight: '400' }}>{restingHr > 0 ? ' bpm' : ''}</Text>
          </Text>
        </View>
      </View>
    </Card>
  );
}
