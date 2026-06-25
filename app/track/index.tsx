import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { useTheme } from '../../src/themes/ThemeContext';
import { useSleepData } from '../../src/data/SleepDataContext';
import { getTonightBedtime } from '../../src/data/mockData';

export default function StartSleepScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { sessions, goals, smartAlarm, startTracking, isDevice } = useSleepData();

  const tonight = getTonightBedtime(sessions, goals);
  const alarmLabel = (() => {
    const h = smartAlarm.wakeHour;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${smartAlarm.wakeMin.toString().padStart(2, '0')} ${ampm}`;
  })();

  const begin = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    startTracking();
    router.replace('/track/live');
  };

  return (
    <LinearGradient colors={theme.bgGradientColors} style={{ flex: 1 }}>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <View style={{ flex: 1, padding: 24, justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <Pressable
              onPress={() => router.back()}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: theme.textDim, fontSize: 16 }}>✕</Text>
            </Pressable>
          </View>

          <Animated.View entering={FadeInUp.duration(500)} style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 60, marginBottom: 16 }}>🌙</Text>
            <Text style={{ fontSize: 28, fontWeight: '700', color: theme.text, marginBottom: 8 }}>Ready for bed?</Text>
            <Text style={{ fontSize: 14, color: theme.textDim, textAlign: 'center', lineHeight: 20 }}>
              {isDevice
                ? "We'll use your iPhone's motion and microphone to track movement, sleep phases, and snoring. Put your phone on the mattress and keep it plugged in."
                : "We'll simulate a night of sleep tracking for this demo."}
            </Text>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 28 }}>
              <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 16, padding: 16, alignItems: 'center', minWidth: 130 }}>
                <Text style={{ fontSize: 10, color: theme.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Suggested Bedtime</Text>
                <Text style={{ fontSize: 22, fontWeight: '700', color: theme.accent }}>{tonight}</Text>
              </View>
              <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 16, padding: 16, alignItems: 'center', minWidth: 130 }}>
                <Text style={{ fontSize: 10, color: theme.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Smart Alarm</Text>
                <Text style={{ fontSize: 22, fontWeight: '700', color: theme.ring2 }}>{smartAlarm.enabled ? alarmLabel : 'Off'}</Text>
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeIn.delay(300)}>
            <Pressable onPress={begin} style={{ paddingVertical: 18, borderRadius: 20, backgroundColor: theme.accent, alignItems: 'center' }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#000' }}>Start Sleep Tracking</Text>
            </Pressable>
            <Text style={{ fontSize: 11, color: theme.textMuted, textAlign: 'center', marginTop: 12 }}>
              Keep the app open. Tracking is simulated for this demo.
            </Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
