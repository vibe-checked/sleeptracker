import React from 'react';
import { ScrollView, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import SleepRings from '../../src/components/SleepRings';
import Card from '../../src/components/Card';
import { useTheme } from '../../src/themes/ThemeContext';
import { formatMinutes } from '../../src/data/mockData';
import { useSleepData } from '../../src/data/SleepDataContext';

export default function ClockScreen() {
  const { theme } = useTheme();
  const { today, sessions, goals, loading } = useSleepData();

  if (loading || !today) {
    return <LinearGradient colors={theme.bgGradientColors} style={{ flex: 1 }} />;
  }

  const sleepGoal = goals.sleepGoal;
  const deepGoal = goals.deepGoal;
  const qualityGoal = goals.qualityGoal;
  const sleepPercent = Math.round((today.totalMinutes / sleepGoal) * 100);
  const qualityPercent = Math.round((today.rating / qualityGoal) * 100);
  const deepPercent = Math.round((today.deepMinutes / deepGoal) * 100);
  const weekAvg = Math.round(sessions.slice(-7).reduce((s, d) => s + d.totalMinutes, 0) / 7);

  const rings = [
    { label: 'Sleep', percent: sleepPercent, color: theme.ring1, value: formatMinutes(today.totalMinutes) },
    { label: 'Quality', percent: qualityPercent, color: theme.ring2, value: `${today.rating}%` },
    { label: 'Deep', percent: deepPercent, color: theme.ring3, value: formatMinutes(today.deepMinutes) },
  ];

  return (
    <View style={{ flex: 1, height: '100%' }}>
      <LinearGradient colors={theme.bgGradientColors} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 100, alignItems: 'center' }}
        >
          <Animated.View entering={FadeInUp.duration(500)} style={{ marginBottom: 20, alignSelf: 'stretch' }}>
            <Text style={{ fontSize: 11, color: theme.textMuted, letterSpacing: 2, textTransform: 'uppercase', fontWeight: '600' }}>
              SleepTracker
            </Text>
            <Text style={{ fontSize: 26, fontWeight: '700', color: theme.text, marginTop: 2 }}>
              Sleep Rings
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(100).duration(500)} style={{ alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 11, color: theme.textMuted, letterSpacing: 2, textTransform: 'uppercase', fontWeight: '600', marginBottom: 4 }}>
              Sleep Rings
            </Text>
            <Text style={{ fontSize: 14, color: theme.textDim }}>{today.date} — Last Night</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(200).duration(600)} style={{ marginVertical: 16 }}>
            <SleepRings
              sleepPercent={sleepPercent}
              qualityPercent={qualityPercent}
              deepPercent={deepPercent}
              theme={theme}
              size={260}
            />
          </Animated.View>

          <View style={{ flexDirection: 'row', gap: 24, marginBottom: 24 }}>
            {rings.map((ring, i) => (
              <Animated.View
                key={ring.label}
                entering={FadeInUp.delay(500 + i * 100).duration(400)}
                style={{ alignItems: 'center' }}
              >
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: ring.color, marginBottom: 4 }} />
                <Text style={{ fontSize: 10, color: theme.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>
                  {ring.label}
                </Text>
                <Text style={{ fontSize: 18, fontWeight: '700', color: ring.color }}>
                  {ring.value}
                </Text>
                <Text style={{ fontSize: 10, color: theme.textMuted }}>{ring.percent}%</Text>
              </Animated.View>
            ))}
          </View>

          <Card delay={600} style={{ width: '100%' }}>
            <Text style={{ fontSize: 11, color: theme.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '600', marginBottom: 14 }}>
              Weekly Rings
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              {sessions.slice(-7).map((day, i) => (
                <Animated.View
                  key={i}
                  entering={FadeInUp.delay(700 + i * 50).duration(300)}
                  style={{ alignItems: 'center' }}
                >
                  <SleepRings
                    sleepPercent={Math.round((day.totalMinutes / sleepGoal) * 100)}
                    qualityPercent={Math.round((day.rating / qualityGoal) * 100)}
                    deepPercent={Math.round((day.deepMinutes / deepGoal) * 100)}
                    theme={theme}
                    size={42}
                  />
                  <Text style={{ fontSize: 9, color: theme.textMuted, marginTop: 3 }}>{day.dayLabel}</Text>
                </Animated.View>
              ))}
            </View>
            <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.cardBorder, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: theme.textDim }}>
                7-day average: <Text style={{ fontWeight: '700', color: theme.accent }}>{formatMinutes(weekAvg)}</Text>
              </Text>
            </View>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
