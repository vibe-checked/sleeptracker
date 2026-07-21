import React from 'react';
import { View, Text } from 'react-native';
import Card from './Card';
import { getTonightBedtime, avgBedtime } from '../data/mockData';
import { useSleepData } from '../data/SleepDataContext';
import { useTheme } from '../themes/ThemeContext';

export default function SleepConsistency() {
  const { theme } = useTheme();
  const { sessions, goals, smartAlarm } = useSleepData();
  const tonightBedtime = getTonightBedtime(sessions, goals, smartAlarm);

  const recent = sessions.slice(-7);
  const avgBed = avgBedtime(recent);

  return (
    <Card delay={180}>
      <Text style={{ fontSize: 11, color: theme.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '600', marginBottom: 12 }}>
        Sleep Consistency
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 55, overflow: 'hidden' }}>
        {recent.map((d, i) => {
          const [h, m] = d.bedtime.split(':').map(Number);
          const bedHour = (h >= 20 ? h : h + 24) + (m || 0) / 60;
          // Scale 20:00 → 8px up to 04:00 → 45px, clamped so late nights
          // can never overflow the card.
          const barHeight = Math.max(8, Math.min(45, ((bedHour - 20) / 8) * 45));
          const isToday = i === 6;
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <View style={{
                width: '80%',
                maxWidth: 30,
                height: barHeight,
                borderRadius: 4,
                backgroundColor: isToday ? theme.accent : theme.ring2,
                opacity: isToday ? 0.9 : 0.4,
              }} />
              <Text style={{ fontSize: 9, color: theme.textMuted }}>{d.dayLabel}</Text>
            </View>
          );
        })}
      </View>

      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: theme.cardBorder,
      }}>
        <View>
          <Text style={{ fontSize: 10, color: theme.textMuted, letterSpacing: 0.8, textTransform: 'uppercase' }}>Avg Bedtime</Text>
          <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text, marginTop: 2 }}>
            {avgBed}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 10, color: theme.textMuted, letterSpacing: 0.8, textTransform: 'uppercase' }}>Tonight</Text>
          <Text style={{ fontSize: 15, fontWeight: '700', color: theme.accent, marginTop: 2 }}>
            {tonightBedtime}
          </Text>
        </View>
      </View>
    </Card>
  );
}
