import React, { useMemo, useState } from 'react';
import { ScrollView, View, Text, Pressable, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Card from '../../src/components/Card';
import LineChart from '../../src/components/LineChart';
import ScatterChart from '../../src/components/ScatterChart';
import CalendarHeatmap from '../../src/components/CalendarHeatmap';
import { useTheme } from '../../src/themes/ThemeContext';
import { useSleepData } from '../../src/data/SleepDataContext';
import { formatMinutes } from '../../src/data/mockData';
import { bestWorst, tagVsRating, correlate, periodComparisons } from '../../src/data/analytics';

const METRICS = [
  { key: 'total', label: 'Sleep', pick: (d: any) => d.totalMinutes, fmt: (v: number) => formatMinutes(v) },
  { key: 'rating', label: 'Rating', pick: (d: any) => d.rating, fmt: (v: number) => `${Math.round(v)}%` },
  { key: 'readiness', label: 'Readiness', pick: (d: any) => d.readiness, fmt: (v: number) => `${Math.round(v)}` },
  { key: 'deep', label: 'Deep', pick: (d: any) => d.deepMinutes, fmt: (v: number) => formatMinutes(v) },
] as const;

export default function ExploreScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { sessions, loading } = useSleepData();
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = Math.max(220, Math.min(screenWidth - 72, 460));
  const [metricKey, setMetricKey] = useState<string>('total');

  const insights = useMemo(() => tagVsRating(sessions), [sessions]);
  const { best, worst } = useMemo(() => bestWorst(sessions), [sessions]);
  const comparisons = useMemo(() => periodComparisons(sessions), [sessions]);
  const scatterPoints = useMemo(
    () => sessions.map(d => ({ x: d.deepMinutes, y: d.rating })),
    [sessions]
  );
  const deepRatingCorr = useMemo(
    () => correlate(sessions.map(d => d.deepMinutes), sessions.map(d => d.rating)),
    [sessions]
  );

  if (loading || sessions.length === 0) {
    return <LinearGradient colors={theme.bgGradientColors} style={{ flex: 1 }} />;
  }

  const metric = METRICS.find(m => m.key === metricKey)!;
  const last30 = sessions.slice(-30);
  const series = last30.map(d => metric.pick(d));
  const labels = last30.map(d => d.date.split(' ')[1]);

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <Text style={{ fontSize: 11, color: theme.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '600', marginBottom: 12 }}>
      {children}
    </Text>
  );

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={theme.bgGradientColors} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          <Animated.View entering={FadeInUp.duration(500)} style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 11, color: theme.textMuted, letterSpacing: 2, textTransform: 'uppercase', fontWeight: '600' }}>SleepTracker</Text>
            <Text style={{ fontSize: 26, fontWeight: '700', color: theme.text, marginTop: 2 }}>Explore</Text>
          </Animated.View>

          {/* This week vs last week */}
          <Card delay={100}>
            <SectionTitle>This Week vs Last</SectionTitle>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {comparisons.map(c => {
                const up = c.delta > 0;
                const flat = c.delta === 0;
                // For AHI, lower is better; otherwise higher is better.
                const good = c.label === 'AHI' ? c.delta < 0 : c.delta > 0;
                const col = flat ? theme.textDim : good ? theme.positive : theme.negative;
                const recentDisplay = c.unit === 'min' ? formatMinutes(c.recent) : `${c.recent}${c.unit}`;
                return (
                  <View key={c.label} style={{ width: '47%', paddingVertical: 8 }}>
                    <Text style={{ fontSize: 10, color: theme.textMuted, letterSpacing: 0.8, textTransform: 'uppercase' }}>{c.label}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                      <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text }}>{recentDisplay}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: col }}>
                        {flat ? '–' : `${up ? '▲' : '▼'} ${Math.abs(c.delta)}${c.unit === 'min' ? 'm' : c.unit}`}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </Card>

          <View style={{ height: 16 }} />

          {/* Trend with metric selector */}
          <Card delay={150}>
            <SectionTitle>30-Day Trend</SectionTitle>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {METRICS.map(m => {
                const active = m.key === metricKey;
                return (
                  <Pressable
                    key={m.key}
                    onPress={() => setMetricKey(m.key)}
                    style={{ flex: 1, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: active ? theme.accent : theme.cardBorder, backgroundColor: active ? theme.accentDim : 'transparent', alignItems: 'center' }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '600', color: active ? theme.accent : theme.textDim }}>{m.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <LineChart values={series} labels={labels} width={chartWidth} theme={theme} unitLabel={metric.fmt} />
          </Card>

          <View style={{ height: 16 }} />

          {/* Calendar heatmap */}
          <Card delay={200}>
            <SectionTitle>Sleep Rating Calendar</SectionTitle>
            <CalendarHeatmap sessions={sessions} width={chartWidth} theme={theme} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
              <Text style={{ fontSize: 10, color: theme.textMuted }}>Low</Text>
              {[theme.negative, theme.ring3, theme.accent, theme.positive].map((c, i) => (
                <View key={i} style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: c, opacity: 0.4 + i * 0.18 }} />
              ))}
              <Text style={{ fontSize: 10, color: theme.textMuted }}>High</Text>
            </View>
          </Card>

          <View style={{ height: 16 }} />

          {/* Best & worst */}
          <Card delay={250}>
            <SectionTitle>Best & Worst Nights</SectionTitle>
            {[{ tag: 'Best', d: best, color: theme.positive }, { tag: 'Worst', d: worst, color: theme.negative }].map(row =>
              row.d ? (
                <Pressable
                  key={row.tag}
                  onPress={() => router.push(`/session/${row.d!.id}`)}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: row.tag === 'Best' ? 1 : 0, borderBottomColor: theme.cardBorder }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 18 }}>{row.d.emoji}</Text>
                    <View>
                      <Text style={{ fontSize: 11, color: row.color, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' }}>{row.tag}</Text>
                      <Text style={{ fontSize: 13, color: theme.text, fontWeight: '600' }}>{row.d.dayLabel}, {row.d.date}</Text>
                      <Text style={{ fontSize: 11, color: theme.textDim }}>{formatMinutes(row.d.totalMinutes)} · {row.d.efficiency}% eff</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 22, fontWeight: '700', color: row.color }}>{row.d.rating}%</Text>
                </Pressable>
              ) : null
            )}
          </Card>

          <View style={{ height: 16 }} />

          {/* Correlation, translated to plain English */}
          <Card delay={300}>
            <SectionTitle>Does Deep Sleep Help You?</SectionTitle>
            <ScatterChart points={scatterPoints} width={chartWidth} theme={theme} yLabel="Rating" xLabel="Deep (min) →" />
            {(() => {
              const r = deepRatingCorr;
              const verdict =
                r >= 0.6 ? { emoji: '💪', label: 'Yes — a lot', text: 'On nights with more deep sleep, you almost always feel better. Protect it: consistent bedtime, cool dark room.', color: theme.positive }
                : r >= 0.3 ? { emoji: '👍', label: 'Yes — somewhat', text: 'More deep sleep usually means a better night for you.', color: theme.positive }
                : r <= -0.3 ? { emoji: '🤔', label: 'Surprisingly, no', text: 'Your better nights don’t line up with deep sleep. Other factors matter more for you.', color: theme.textDim }
                : { emoji: '🤷', label: 'No clear pattern yet', text: 'Not enough of a pattern so far. Keep tracking — this gets smarter with more nights.', color: theme.textDim };
              return (
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 12, backgroundColor: theme.accentDim, borderRadius: 12, padding: 12 }}>
                  <Text style={{ fontSize: 22 }}>{verdict.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: verdict.color, marginBottom: 2 }}>{verdict.label}</Text>
                    <Text style={{ fontSize: 12, color: theme.textDim, lineHeight: 17 }}>
                      Each dot is one night. {verdict.text}
                    </Text>
                  </View>
                </View>
              );
            })()}
          </Card>

          <View style={{ height: 16 }} />

          {/* Tag insights */}
          {insights.length > 0 && (
            <Card delay={350}>
              <SectionTitle>How Tags Affect Your Sleep</SectionTitle>
              {insights.slice(0, 8).map((ins, i) => {
                const good = ins.delta >= 0;
                const mag = Math.min(100, Math.abs(ins.delta) * 4);
                return (
                  <View key={ins.tag.id} style={{ paddingVertical: 8, borderBottomWidth: i < Math.min(insights.length, 8) - 1 ? 1 : 0, borderBottomColor: theme.cardBorder }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <Text style={{ fontSize: 13, color: theme.text }}>{ins.tag.icon} {ins.tag.label}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: good ? theme.positive : theme.negative }}>
                        {good ? '+' : ''}{ins.delta} pts
                      </Text>
                    </View>
                    <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.cardBorder, overflow: 'hidden' }}>
                      <View style={{ height: 6, width: `${mag}%`, borderRadius: 3, backgroundColor: good ? theme.positive : theme.negative, alignSelf: good ? 'flex-start' : 'flex-end' }} />
                    </View>
                  </View>
                );
              })}
              <Text style={{ fontSize: 10, color: theme.textMuted, marginTop: 8 }}>
                Avg rating on nights with each tag vs without.
              </Text>
            </Card>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
