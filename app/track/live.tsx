import React, { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';
import LiveRing from '../../src/components/LiveRing';
import SleepStageGraph from '../../src/components/SleepStageGraph';
import Card from '../../src/components/Card';
import { useTheme } from '../../src/themes/ThemeContext';
import { useSleepData } from '../../src/data/SleepDataContext';
import { formatMinutes } from '../../src/data/mockData';

const STAGE_INFO: Record<number, { label: string; emoji: string }> = {
  0: { label: 'Awake', emoji: '👁️' },
  1: { label: 'REM', emoji: '💭' },
  2: { label: 'Light', emoji: '🌤️' },
  3: { label: 'Deep', emoji: '🌊' },
};

export default function LiveTrackingScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { liveSession, stopTracking } = useSleepData();

  // If there's no active session (e.g. opened directly), bounce out.
  useEffect(() => {
    if (!liveSession) router.replace('/(tabs)');
  }, [!liveSession]);

  if (!liveSession) {
    return <LinearGradient colors={theme.bgGradientColors} style={{ flex: 1 }} />;
  }

  const samples = liveSession.samples;
  const elapsedMin = samples.length; // 1 sample ≈ 1 simulated minute
  const last = samples[samples.length - 1];
  const stage = last ? STAGE_INFO[last.stage] : STAGE_INFO[0];
  const hr = last?.heartRate ?? 60;

  const wake = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const created = stopTracking();
    if (created) router.replace(`/session/${created.id}`);
    else router.replace('/(tabs)');
  };

  return (
    <LinearGradient colors={theme.bgGradientColors} style={{ flex: 1 }}>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <View style={{ flex: 1, padding: 24, justifyContent: 'space-between' }}>
          <View style={{ alignItems: 'center', marginTop: 8 }}>
            <Text style={{ fontSize: 11, color: theme.textMuted, letterSpacing: 2, textTransform: 'uppercase', fontWeight: '600' }}>
              Tracking Sleep
            </Text>
            <Text style={{ fontSize: 13, color: theme.textDim, marginTop: 4 }}>Live · keep the app open</Text>
          </View>

          <View style={{ alignItems: 'center' }}>
            <LiveRing size={240} color={theme.ring1} glowColor={theme.ring1Glow}>
              <Text style={{ fontSize: 44, fontWeight: '700', color: theme.text }}>{formatMinutes(elapsedMin)}</Text>
              <Text style={{ fontSize: 13, color: theme.textDim, marginTop: 2 }}>asleep</Text>
            </LiveRing>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 28 }}>
              <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 16, padding: 14, alignItems: 'center', minWidth: 120 }}>
                <Text style={{ fontSize: 10, color: theme.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Stage</Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: theme.ring3 }}>{stage.emoji} {stage.label}</Text>
              </View>
              <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 16, padding: 14, alignItems: 'center', minWidth: 120 }}>
                <Text style={{ fontSize: 10, color: theme.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Heart Rate</Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: theme.hrColor }}>{hr} <Text style={{ fontSize: 12, color: theme.textDim }}>bpm</Text></Text>
              </View>
            </View>
          </View>

          {samples.length >= 2 ? (
            <Animated.View entering={FadeIn}>
              <Card>
                <Text style={{ fontSize: 10, color: theme.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Tonight so far</Text>
                <SleepStageGraph stages={samples} theme={theme} />
              </Card>
            </Animated.View>
          ) : (
            <View style={{ height: 40 }} />
          )}

          <Pressable onPress={wake} style={{ paddingVertical: 18, borderRadius: 20, backgroundColor: theme.negative, alignItems: 'center' }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#fff' }}>Wake Up</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
