import React from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Card from '../../src/components/Card';
import { useTheme } from '../../src/themes/ThemeContext';
import { formatMinutes, sourceLabel } from '../../src/data/mockData';
import { useSleepData } from '../../src/data/SleepDataContext';

// List-first history: the sessions ARE the content. A slim averages strip up
// top, every night tappable right below it; trends live on the Explore tab.
export default function HistoryScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { sessions, loading } = useSleepData();

  if (loading || sessions.length === 0) {
    return <LinearGradient colors={theme.bgGradientColors} style={{ flex: 1 }} />;
  }

  const recent14 = sessions.slice(-14);
  const avgTotal = Math.round(recent14.reduce((s, d) => s + d.totalMinutes, 0) / recent14.length);
  const avgRating = Math.round(recent14.reduce((s, d) => s + d.rating, 0) / recent14.length);
  const avgDeep = Math.round(recent14.reduce((s, d) => s + d.deepMinutes, 0) / recent14.length);
  const allNights = [...sessions].reverse();

  return (
    <View style={{ flex: 1, height: '100%' }}>
      <LinearGradient colors={theme.bgGradientColors} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        >
          <Animated.View entering={FadeInUp.duration(500)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
            <View>
              <Text style={{ fontSize: 11, color: theme.textMuted, letterSpacing: 2, textTransform: 'uppercase', fontWeight: '600' }}>
                SleepTracker
              </Text>
              <Text style={{ fontSize: 26, fontWeight: '700', color: theme.text, marginTop: 2 }}>
                Sleep History
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/explore')}
              style={({ pressed }) => ({
                paddingVertical: 7, paddingHorizontal: 12, borderRadius: 12, marginBottom: 3,
                backgroundColor: theme.accentDim, borderWidth: 1, borderColor: theme.cardBorder,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: theme.accent }}>View Trends ›</Text>
            </Pressable>
          </Animated.View>

          {/* Slim 14-night averages strip */}
          <Animated.View
            entering={FadeInUp.delay(50).duration(400)}
            style={{
              flexDirection: 'row',
              backgroundColor: theme.cardBg,
              borderColor: theme.cardBorder,
              borderWidth: 1,
              borderRadius: 14,
              paddingVertical: 10,
              marginBottom: 14,
            }}
          >
            {[
              { label: 'Avg Sleep', value: formatMinutes(avgTotal), color: theme.ring1 },
              { label: 'Avg Rating', value: `${avgRating}%`, color: theme.ring2 },
              { label: 'Avg Deep', value: formatMinutes(avgDeep), color: theme.ring3 },
            ].map((stat, i) => (
              <View
                key={stat.label}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  borderLeftWidth: i > 0 ? 1 : 0,
                  borderLeftColor: theme.cardBorder,
                }}
              >
                <Text style={{ fontSize: 9, color: theme.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>
                  {stat.label}
                </Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: stat.color }}>{stat.value}</Text>
              </View>
            ))}
          </Animated.View>

          {/* The list is the page: every night, newest first */}
          <Card delay={100}>
            <Text style={{ fontSize: 11, color: theme.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '600', marginBottom: 10 }}>
              All Nights
            </Text>
            {allNights.map((d, i) => (
              <Pressable
                key={d.id}
                onPress={() => router.push(`/session/${d.id}`)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 12,
                  borderBottomWidth: i < allNights.length - 1 ? 1 : 0,
                  borderBottomColor: theme.cardBorder,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <Text style={{ fontSize: 18 }}>{d.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text }}>
                        {d.dayLabel}, {d.date}
                      </Text>
                      <Text style={{ fontSize: 10, color: theme.textMuted }}>{sourceLabel(d).icon}</Text>
                    </View>
                    <Text style={{ fontSize: 11, color: theme.textDim }}>
                      {d.bedtime} – {d.wakeTime} · {formatMinutes(d.totalMinutes)}
                    </Text>
                    {d.note || d.tags.length > 0 ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        {d.note ? (
                          <Text numberOfLines={1} ellipsizeMode="tail" style={{ flexShrink: 1, fontSize: 10, color: theme.textMuted, fontStyle: 'italic' }}>
                            {d.note}
                          </Text>
                        ) : null}
                        {d.tags.length > 0 ? (
                          <Text numberOfLines={1} style={{ fontSize: 11 }}>
                            {d.tags.slice(0, 5).map(t => t.icon).join(' ')}
                          </Text>
                        ) : null}
                      </View>
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
