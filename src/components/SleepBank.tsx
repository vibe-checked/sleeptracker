import React from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import Card from './Card';
import BarChart from './BarChart';
import { getSleepBank, formatMinutes } from '../data/mockData';
import { useSleepData } from '../data/SleepDataContext';
import { useTheme } from '../themes/ThemeContext';

export default function SleepBank() {
  const { theme } = useTheme();
  const { sessions, goals } = useSleepData();
  const bankData = getSleepBank(sessions, goals);
  const last7 = sessions.slice(-7);
  const current = bankData[bankData.length - 1];
  const isPositive = current >= 0;
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = Math.max(200, Math.min(screenWidth - 72, 450));

  const data = last7.map((d, i) => ({
    label: d.dayLabel,
    value: bankData[i],
    color: bankData[i] >= 0 ? theme.positive : theme.negative,
  }));

  return (
    <Card delay={200}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <View>
          <Text style={{ fontSize: 11, color: theme.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '600' }}>
            Sleep Bank
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
            <Text style={{ fontSize: 24, fontWeight: '700', color: isPositive ? theme.positive : theme.negative }}>
              {isPositive ? '+' : '−'}{formatMinutes(Math.abs(Math.round(current)))}
            </Text>
          </View>
        </View>
        <View style={{
          paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
          backgroundColor: isPositive ? theme.positive + '15' : theme.negative + '15',
        }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: isPositive ? theme.positive : theme.negative }}>
            {isPositive ? 'Surplus' : 'Deficit'}
          </Text>
        </View>
      </View>
      <Text style={{ fontSize: 11, color: theme.textDim, marginBottom: 10 }}>
        How far your last 7 tracked nights run ahead (+) or behind (−) your {formatMinutes(goals.sleepGoal)} goal, night by night.
      </Text>
      <BarChart data={data} width={chartWidth} height={130} theme={theme} />
    </Card>
  );
}
