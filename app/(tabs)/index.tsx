import React, { useState } from 'react';
import { ScrollView, View, Text, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import SleepRings from '../../src/components/SleepRings';
import ReadinessCard from '../../src/components/ReadinessCard';
import SleepConsistency from '../../src/components/SleepConsistency';
import SleepStageGraph from '../../src/components/SleepStageGraph';
import HealthCards from '../../src/components/HealthCards';
import SleepBank from '../../src/components/SleepBank';
import Card from '../../src/components/Card';
import { useTheme } from '../../src/themes/ThemeContext';
import { formatMinutes, getTonightBedtime, computeRecovery } from '../../src/data/mockData';
import { useSleepData } from '../../src/data/SleepDataContext';

export default function TodayScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { today, sessions, goals, smartAlarm, loading, isDevice, dataSource, connectHealth, syncFromHealth } = useSleepData();
  const [syncing, setSyncing] = useState(false);

  const goTrack = () => router.push('/track');
  // Pull tonight's sleep from Apple Health (watch users).
  const syncHealth = async () => {
    setSyncing(true);
    try {
      if (dataSource !== 'healthkit') await connectHealth();
      else await syncFromHealth();
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <LinearGradient colors={theme.bgGradientColors} style={{ flex: 1 }} />;
  }

  // Device with no nights yet: onboarding/empty state.
  if (!today) {
    return (
      <View style={{ flex: 1 }}>
        <LinearGradient colors={theme.bgGradientColors} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        <SafeAreaView edges={['top']} style={{ flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 56, marginBottom: 16 }}>🌙</Text>
          <Text style={{ fontSize: 22, fontWeight: '700', color: theme.text, textAlign: 'center', marginBottom: 10 }}>
            No sleep data yet
          </Text>
          <Text style={{ fontSize: 14, color: theme.textDim, textAlign: 'center', lineHeight: 20, marginBottom: 28 }}>
            Track tonight with your iPhone on the mattress — or wear your Apple Watch and sync it in the morning.
          </Text>
          <Pressable
            onPress={goTrack}
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 16, backgroundColor: theme.accent,
              opacity: pressed ? 0.75 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <Text style={{ fontSize: 17 }}>📱</Text>
            <View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#000' }}>Track Sleep with iPhone</Text>
              <Text style={{ fontSize: 11, color: '#000', opacity: 0.6, marginTop: 1 }}>No Apple Watch needed</Text>
            </View>
          </Pressable>
          {isDevice && (
            <Pressable onPress={syncHealth} disabled={syncing} style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 14 }}>⌚</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: theme.accent }}>{syncing ? 'Syncing…' : 'Have an Apple Watch? Sync from Health'}</Text>
            </Pressable>
          )}
        </SafeAreaView>
      </View>
    );
  }

  const sleepPercent = Math.round((today.totalMinutes / goals.sleepGoal) * 100);
  const qualityPercent = today.rating; // purple ring shows the rating itself, not vs the target
  const deepPercent = Math.round((today.deepMinutes / goals.deepGoal) * 100);
  const tonightBedtime = getTonightBedtime(sessions, goals, smartAlarm);

  const stats = [
    { label: 'Total Sleep', value: formatMinutes(today.totalMinutes), color: theme.ring1 },
    { label: 'Sleep Rating', value: `${today.rating}%`, color: theme.ring2 },
    { label: 'Deep Sleep', value: formatMinutes(today.deepMinutes), color: theme.ring3 },
    { label: 'REM Sleep', value: formatMinutes(today.remMinutes), color: theme.remColor },
    { label: 'Efficiency', value: `${today.efficiency}%`, color: theme.accent },
  ];

  return (
    <View style={{ flex: 1, overflow: 'hidden' }}>
      <LinearGradient colors={theme.bgGradientColors} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={syncing}
              onRefresh={syncHealth}
              tintColor={theme.accent}
            />
          }
        >
          {/* Header */}
          <Animated.View entering={FadeInUp.duration(500)} style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 11, color: theme.textMuted, letterSpacing: 2, textTransform: 'uppercase', fontWeight: '600' }}>
              SleepTracker
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 26, fontWeight: '700', color: theme.text, marginTop: 2 }}>
                Good Morning
              </Text>
              <View style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: theme.accentDim, borderWidth: 1, borderColor: theme.cardBorder,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 16 }}>⌚</Text>
              </View>
            </View>
          </Animated.View>

          {/* Track with iPhone (no watch) + optional Apple Health sync (watch) */}
          <Animated.View entering={FadeInUp.delay(50).duration(500)} style={{ marginBottom: 16 }}>
            <Pressable
              onPress={goTrack}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', gap: 8,
                paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, backgroundColor: theme.accent,
                opacity: pressed ? 0.75 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <Text style={{ fontSize: 17 }}>📱</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#000' }}>Track Sleep with iPhone</Text>
                <Text style={{ fontSize: 11, color: '#000', opacity: 0.6, marginTop: 1 }}>No Apple Watch needed · phone on the mattress</Text>
              </View>
              <View style={{
                paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12,
                backgroundColor: 'rgba(0,0,0,0.18)',
                flexDirection: 'row', alignItems: 'center', gap: 4,
              }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#000' }}>Start</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#000' }}>›</Text>
              </View>
            </Pressable>
            {isDevice && (
              <Pressable onPress={syncHealth} disabled={syncing} style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Text style={{ fontSize: 13 }}>⌚</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: theme.accent }}>{syncing ? 'Syncing…' : 'Have an Apple Watch? Sync from Health'}</Text>
              </Pressable>
            )}
          </Animated.View>

          {/* Morning Briefing */}
          <Card delay={100}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: theme.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '600', marginBottom: 4 }}>
                  Morning Briefing
                </Text>
                <Text style={{ fontSize: 18, fontWeight: '600', color: theme.text, marginBottom: 14 }}>
                  {today.rating >= 80 ? 'Great sleep last night' : today.rating >= 60 ? 'Decent rest last night' : 'Rough night — take it easy'}
                </Text>
              </View>
              {today.emoji ? <Text style={{ fontSize: 26 }}>{today.emoji}</Text> : null}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <SleepRings
                sleepPercent={sleepPercent}
                qualityPercent={qualityPercent}
                deepPercent={deepPercent}
                goalLabel="OVERALL"
                labelPercent={today.rating}
                labelBelow
                theme={theme}
                size={126}
              />
              <View style={{ flex: 1, marginLeft: 16, gap: 10 }}>
                {stats.map(item => (
                  <View key={item.label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: theme.textDim }}>{item.label}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: item.color }}>{item.value}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={{ flexDirection: 'row', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: theme.cardBorder }}>
              {[
                { label: 'Bedtime', value: today.bedtime },
                { label: 'Wake', value: today.wakeTime },
                { label: 'Awake', value: formatMinutes(today.awakeMinutes) },
              ].map(item => (
                <View key={item.label} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 9, color: theme.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 }}>{item.label}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>{item.value}</Text>
                </View>
              ))}
            </View>

            {today.note ? (
              <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.cardBorder }}>
                <Text style={{ fontSize: 12, color: theme.textDim, fontStyle: 'italic' }}>"{today.note}"</Text>
              </View>
            ) : null}
          </Card>

          <View style={{ height: 16 }} />
          <ReadinessCard
            readiness={today.readiness}
            sleepFuel={today.sleepFuel}
            recovery={computeRecovery(today.health.hrv, today.efficiency)}
            efficiency={today.efficiency}
            restingHr={today.health.heartRateMin}
            awakeMin={today.awakeMinutes}
          />

          <View style={{ height: 16 }} />
          <SleepConsistency />

          <View style={{ height: 16 }} />

          <View style={{ height: 16 }} />
          <Card delay={200}>
            <Text style={{ fontSize: 11, color: theme.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '600', marginBottom: 12 }}>
              Sleep Stages
            </Text>
            <SleepStageGraph stages={today.stages} theme={theme} />
          </Card>

          <View style={{ height: 16 }} />
          <Text style={{ fontSize: 11, color: theme.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '600', marginBottom: 10, paddingLeft: 4 }}>
            Health Metrics
          </Text>
          <HealthCards health={today.health} />

          <View style={{ height: 16 }} />
          <SleepBank />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
