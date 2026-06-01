import React from 'react';
import { ScrollView, View, Text, Pressable, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Card from '../../src/components/Card';
import BarChart from '../../src/components/BarChart';
import { useTheme } from '../../src/themes/ThemeContext';
import { sleepHistory, formatMinutes } from '../../src/data/mockData';

export default function HistoryScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = Math.max(200, Math.min(screenWidth - 72, 450));

  const avgTotal = Math.round(sleepHistory.reduce((s, d) => s + d.totalMinutes, 0) / sleepHistory.length);
  const avgRating = Math.round(sleepHistory.reduce((s, d) => s + d.rating, 0) / sleepHistory.length);
  const avgDeep = Math.round(sleepHistory.reduce((s, d) => s + d.deepMinutes, 0) / sleepHistory.length);

  const stackedData = sleepHistory.map(d => ({
    label: d.dayLabel,
    segments: [
      { value: d.deepMinutes, color: theme.deepColor },
      { value: d.remMinutes, color: theme.remColor },
      { value: d.lightMinutes, color: theme.lightColor },
    ],
  }));

  const ratingData = sleepHistory.map(d => ({
    label: d.dayLabel,
    value: d.rating,
    color: d.rating >= 80 ? theme.positive : d.rating >= 60 ? theme.accent : theme.negative,
  }));

  return (
    <View style={{ flex: 1, height: '100%' }}>
      <LinearGradient colors={theme.bgGradientColors} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        >
          <Animated.View entering={FadeInUp.duration(500)} style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 11, color: theme.textMuted, letterSpacing: 2, textTransform: 'uppercase', fontWeight: '600' }}>
              SleepTracker
            </Text>
            <Text style={{ fontSize: 26, fontWeight: '700', color: theme.text, marginTop: 2 }}>
              Sleep History
            </Text>
          </Animated.View>

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Avg Sleep', value: formatMinutes(avgTotal), color: theme.ring1 },
              { label: 'Avg Rating', value: `${avgRating}%`, color: theme.ring2 },
              { label: 'Avg Deep', value: formatMinutes(avgDeep), color: theme.ring3 },
            ].map((stat, i) => (
              <Animated.View
                key={stat.label}
                entering={FadeInUp.delay(i * 100).duration(400)}
                style={{
                  flex: 1,
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorder,
                  borderWidth: 1,
                  borderRadius: 16,
                  padding: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 9, color: theme.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
                  {stat.label}
                </Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: stat.color }}>{stat.value}</Text>
              </Animated.View>
            ))}
          </View>

          <Card delay={150}>
            <Text style={{ fontSize: 11, color: theme.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '600', marginBottom: 8 }}>
              Sleep Duration — 14 Days
            </Text>
            <BarChart data={stackedData} width={chartWidth} height={200} theme={theme} stacked />
            <View style={{ flexDirection: 'row', gap: 14, justifyContent: 'center', marginTop: 8 }}>
              {[
                { label: 'Deep', color: theme.deepColor },
                { label: 'REM', color: theme.remColor },
                { label: 'Light', color: theme.lightColor },
              ].map(l => (
                <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: l.color }} />
                  <Text style={{ fontSize: 10, color: theme.textDim }}>{l.label}</Text>
                </View>
              ))}
            </View>
          </Card>

          <View style={{ height: 16 }} />

          <Card delay={250}>
            <Text style={{ fontSize: 11, color: theme.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '600', marginBottom: 8 }}>
              Sleep Rating Trend
            </Text>
            <BarChart data={ratingData} width={chartWidth} height={140} theme={theme} />
          </Card>

          <View style={{ height: 16 }} />

          <Card delay={350}>
            <Text style={{ fontSize: 11, color: theme.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '600', marginBottom: 10 }}>
              Recent Sessions
            </Text>
            {sleepHistory.slice(-7).reverse().map((d, i) => (
              <Pressable
                key={i}
                onPress={() => router.push(`/session/${sleepHistory.length - 1 - i}`)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 12,
                  borderBottomWidth: i < 6 ? 1 : 0,
                  borderBottomColor: theme.cardBorder,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <Text style={{ fontSize: 18 }}>{d.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text }}>
                      {d.dayLabel}, {d.date}
                    </Text>
                    <Text style={{ fontSize: 11, color: theme.textDim }}>
                      {d.bedtime} – {d.wakeTime} · {formatMinutes(d.totalMinutes)}
                    </Text>
                    {d.note ? (
                      <Text style={{ fontSize: 10, color: theme.textMuted, marginTop: 2, fontStyle: 'italic' }}>
                        {d.note}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{
                    fontSize: 16, fontWeight: '700',
                    color: d.rating >= 80 ? theme.positive : d.rating >= 60 ? theme.accent : theme.negative,
                  }}>
                    {d.rating}%
                  </Text>
                  <Text style={{ fontSize: 9, color: theme.textMuted }}>rating</Text>
                </View>
              </Pressable>
            ))}
          </Card>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
