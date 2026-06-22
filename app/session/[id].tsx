import React from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import SleepStageGraph from '../../src/components/SleepStageGraph';
import Card from '../../src/components/Card';
import { useTheme } from '../../src/themes/ThemeContext';
import { formatMinutes } from '../../src/data/mockData';
import { useSleepData } from '../../src/data/SleepDataContext';

export default function SessionDetailScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getById } = useSleepData();
  const day = getById(id);

  if (!day) {
    return (
      <LinearGradient colors={theme.bgGradientColors} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: theme.text }}>Session not found</Text>
      </LinearGradient>
    );
  }

  const readinessColor = day.readiness >= 80 ? theme.positive : day.readiness >= 60 ? theme.accent : theme.negative;

  return (
    <LinearGradient colors={theme.bgGradientColors} style={{ flex: 1 }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        >
          {/* Header */}
          <Animated.View entering={FadeInUp.duration(400)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <View>
              <Text style={{ fontSize: 11, color: theme.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '600' }}>
                Sleep Session
              </Text>
              <Text style={{ fontSize: 24, fontWeight: '700', color: theme.text, marginTop: 2 }}>
                {day.dayLabel}, {day.date}
              </Text>
            </View>
            <Pressable
              onPress={() => router.back()}
              style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{ color: theme.textDim, fontSize: 16 }}>✕</Text>
            </Pressable>
          </Animated.View>

          {/* Emoji & Note */}
          {(day.emoji || day.note) ? (
            <Card delay={50}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 24 }}>{day.emoji}</Text>
                <Text style={{ fontSize: 13, color: theme.textDim, fontStyle: day.note ? 'normal' : 'italic', flex: 1 }}>
                  {day.note || 'No notes'}
                </Text>
              </View>
            </Card>
          ) : null}

          <View style={{ height: 12 }} />

          {/* Metrics grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[
              { label: 'Total', value: formatMinutes(day.totalMinutes), color: theme.ring1 },
              { label: 'Rating', value: `${day.rating}%`, color: theme.ring2 },
              { label: 'Efficiency', value: `${day.efficiency}%`, color: theme.ring3 },
              { label: 'Deep', value: formatMinutes(day.deepMinutes), color: theme.deepColor },
              { label: 'REM', value: formatMinutes(day.remMinutes), color: theme.remColor },
              { label: 'Light', value: formatMinutes(day.lightMinutes), color: theme.lightColor },
            ].map((m, i) => (
              <Animated.View
                key={m.label}
                entering={FadeInUp.delay(100 + i * 50).duration(400)}
                style={{
                  width: '31.5%',
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorder,
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 10,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 9, color: theme.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
                  {m.label}
                </Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: m.color }}>{m.value}</Text>
              </Animated.View>
            ))}
          </View>

          <View style={{ height: 12 }} />

          {/* Time info */}
          <Card delay={200}>
            <View style={{ flexDirection: 'row' }}>
              {[
                { label: 'Bedtime', value: day.bedtime },
                { label: 'Wake', value: day.wakeTime },
                { label: 'Lights Off', value: `${day.lightsOffMinutes}m` },
                { label: 'Awake', value: formatMinutes(day.awakeMinutes) },
              ].map(t => (
                <View key={t.label} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 9, color: theme.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>{t.label}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>{t.value}</Text>
                </View>
              ))}
            </View>
          </Card>

          <View style={{ height: 12 }} />

          {/* Readiness / Fuel / Stress */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { label: 'Readiness', value: day.readiness, color: readinessColor },
              { label: 'Sleep Fuel', value: day.sleepFuel, color: theme.ring1 },
              { label: 'Stress', value: day.priorDayStress, color: day.priorDayStress > 60 ? theme.negative : theme.text },
            ].map((m, i) => (
              <Animated.View
                key={m.label}
                entering={FadeInUp.delay(250 + i * 50).duration(400)}
                style={{
                  flex: 1,
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorder,
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 10,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 9, color: theme.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{m.label}</Text>
                <Text style={{ fontSize: 18, fontWeight: '700', color: m.color }}>{m.value}</Text>
              </Animated.View>
            ))}
          </View>

          <View style={{ height: 12 }} />

          {/* Health */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { label: 'HR Avg', value: `${day.health.heartRateAvg}`, unit: 'bpm', color: theme.hrColor },
              { label: 'SpO2', value: day.health.spo2.toFixed(1), unit: '%', color: theme.ring1 },
              { label: 'HRV', value: `${day.health.hrv}`, unit: 'ms', color: theme.ring2 },
            ].map((m, i) => (
              <Animated.View
                key={m.label}
                entering={FadeInUp.delay(350 + i * 50).duration(400)}
                style={{
                  flex: 1,
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorder,
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 10,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 9, color: theme.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{m.label}</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: m.color }}>
                  {m.value}<Text style={{ fontSize: 10, color: theme.textDim, fontWeight: '400' }}> {m.unit}</Text>
                </Text>
              </Animated.View>
            ))}
          </View>

          <View style={{ height: 12 }} />

          {/* Sleep Stages */}
          <Card delay={400}>
            <Text style={{ fontSize: 10, color: theme.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
              Sleep Stages
            </Text>
            <SleepStageGraph stages={day.stages} theme={theme} />
          </Card>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
