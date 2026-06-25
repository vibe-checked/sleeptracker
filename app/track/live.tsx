import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useKeepAwake } from 'expo-keep-awake';
import { Accelerometer } from 'expo-sensors';
import {
  useAudioRecorder,
  RecordingPresets,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
} from 'expo-audio';
import LiveRing from '../../src/components/LiveRing';
import SleepStageGraph from '../../src/components/SleepStageGraph';
import Card from '../../src/components/Card';
import { useTheme } from '../../src/themes/ThemeContext';
import { useSleepData } from '../../src/data/SleepDataContext';
import { formatMinutes } from '../../src/data/mockData';
import { accelMagnitude, movementFromAccel, dbToNoise, estimateStage } from '../../src/sensors/sleepSensors';
import type { NoiseSample, SnoringSample } from '../../src/data/types';

const STAGE_INFO: Record<number, { label: string; emoji: string }> = {
  0: { label: 'Awake', emoji: '👁️' },
  1: { label: 'REM', emoji: '💭' },
  2: { label: 'Light', emoji: '🌤️' },
  3: { label: 'Deep', emoji: '🌊' },
};

export default function LiveTrackingScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { liveSession, recordSample, stopTracking, isDevice } = useSleepData();

  useKeepAwake();
  const recorder = useAudioRecorder({ ...RecordingPresets.LOW_QUALITY, isMeteringEnabled: true });

  // Real overnight cadence on device (1 slot = 1 min); fast on the simulator.
  const SAMPLE_MS = isDevice ? 60000 : 1500;

  const accelBuf = useRef<number[]>([]);
  const peakDb = useRef<number>(-160);
  const noiseRef = useRef<NoiseSample[]>([]);
  const snoringRef = useRef<SnoringSample[]>([]);
  const slotIdx = useRef(0);
  const accelSub = useRef<{ remove: () => void } | null>(null);
  const meterTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const slotTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [stageNow, setStageNow] = useState(0);
  const [moveNow, setMoveNow] = useState(0);
  const [noiseNow, setNoiseNow] = useState(0);

  useEffect(() => {
    if (!liveSession) {
      router.replace('/(tabs)');
      return;
    }
    let cancelled = false;

    const onSlot = () => {
      slotIdx.current += 1;
      let movement = 0;
      let db = -160;
      if (isDevice) {
        movement = movementFromAccel(accelBuf.current);
        accelBuf.current = [];
        db = peakDb.current;
        peakDb.current = -160;
      } else {
        // Simulator: synthesize movement that follows a realistic sleep cycle
        // so estimateStage produces a varied Deep/Light/REM/Awake hypnogram.
        const cyclePos = (slotIdx.current % 90) / 90;
        if (Math.random() < 0.07) movement = 0.22 + Math.random() * 0.2; // brief wake
        else if (cyclePos < 0.2) movement = 0.08 + Math.random() * 0.05; // light
        else if (cyclePos < 0.5) movement = Math.random() * 0.04; // deep
        else if (cyclePos < 0.7) movement = 0.08 + Math.random() * 0.05; // light
        else movement = Math.random() * 0.04; // -> REM window
        db = -56 + (Math.random() < 0.12 ? Math.random() * 32 : Math.random() * 8);
      }
      const stage = estimateStage(movement, slotIdx.current);
      const noise01 = dbToNoise(db);
      const h = Math.floor(slotIdx.current / 60);
      const m = slotIdx.current % 60;
      const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      recordSample(stage, 0, time); // no heart rate from the phone
      noiseRef.current.push({ time, db: Math.max(0, Math.round(db + 90)) });
      const snore = (stage === 2 || stage === 3) && noise01 > 50 ? noise01 : 0;
      snoringRef.current.push({ time, intensity: snore });
      if (!cancelled) {
        setStageNow(stage);
        setMoveNow(Math.min(100, Math.round(movement * 300)));
        setNoiseNow(noise01);
      }
    };

    (async () => {
      if (isDevice) {
        try {
          await requestRecordingPermissionsAsync();
          await setAudioModeAsync({
            allowsRecording: true,
            playsInSilentMode: true,
            shouldPlayInBackground: true,
            interruptionMode: 'doNotMix',
          });
          await recorder.prepareToRecordAsync({ ...RecordingPresets.LOW_QUALITY, isMeteringEnabled: true });
          recorder.record();
        } catch {
          // mic unavailable — motion tracking still works
        }
        Accelerometer.setUpdateInterval(250);
        accelSub.current = Accelerometer.addListener(({ x, y, z }) => {
          accelBuf.current.push(accelMagnitude(x, y, z));
        });
        meterTimer.current = setInterval(() => {
          try {
            const st = recorder.getStatus();
            if (st?.metering != null) peakDb.current = Math.max(peakDb.current, st.metering);
          } catch {
            // ignore
          }
        }, 400);
      }
      slotTimer.current = setInterval(onSlot, SAMPLE_MS);
    })();

    return () => {
      cancelled = true;
      accelSub.current?.remove();
      if (meterTimer.current) clearInterval(meterTimer.current);
      if (slotTimer.current) clearInterval(slotTimer.current);
      recorder.stop?.().catch?.(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!liveSession) {
    return <LinearGradient colors={theme.bgGradientColors} style={{ flex: 1 }} />;
  }

  const samples = liveSession.samples;
  const elapsedMin = samples.length;
  const stage = STAGE_INFO[stageNow] ?? STAGE_INFO[0];

  const wake = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    accelSub.current?.remove();
    if (meterTimer.current) clearInterval(meterTimer.current);
    if (slotTimer.current) clearInterval(slotTimer.current);
    try {
      await recorder.stop();
    } catch {
      // ignore
    }
    const created = stopTracking({ noise: noiseRef.current, snoring: snoringRef.current, hasHeartRate: false });
    if (created) router.replace(`/session/${created.id}`);
    else router.replace('/(tabs)');
  };

  const MetricBox = ({ label, value, unit, color }: { label: string; value: string; unit?: string; color: string }) => (
    <View style={{ flex: 1, backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 16, padding: 14, alignItems: 'center' }}>
      <Text style={{ fontSize: 10, color: theme.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>{label}</Text>
      <Text style={{ fontSize: 18, fontWeight: '700', color }}>
        {value}{unit ? <Text style={{ fontSize: 11, color: theme.textDim }}> {unit}</Text> : null}
      </Text>
    </View>
  );

  return (
    <LinearGradient colors={theme.bgGradientColors} style={{ flex: 1 }}>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <View style={{ flex: 1, padding: 24, justifyContent: 'space-between' }}>
          <View style={{ alignItems: 'center', marginTop: 8 }}>
            <Text style={{ fontSize: 11, color: theme.textMuted, letterSpacing: 2, textTransform: 'uppercase', fontWeight: '600' }}>
              Tracking Sleep
            </Text>
            <Text style={{ fontSize: 13, color: theme.textDim, marginTop: 4, textAlign: 'center' }}>
              {isDevice ? 'Place your phone on the mattress, screen down' : 'Simulated demo on the simulator'}
            </Text>
          </View>

          <View style={{ alignItems: 'center' }}>
            <LiveRing size={230} color={theme.ring1} glowColor={theme.ring1Glow}>
              <Text style={{ fontSize: 30, fontWeight: '700', color: theme.text }}>{stage.emoji} {stage.label}</Text>
              <Text style={{ fontSize: 36, fontWeight: '700', color: theme.text, marginTop: 4 }}>{formatMinutes(elapsedMin)}</Text>
              <Text style={{ fontSize: 12, color: theme.textDim, marginTop: 2 }}>tracked</Text>
            </LiveRing>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
              <MetricBox label="Movement" value={String(moveNow)} color={theme.ring3} />
              <MetricBox label="Noise" value={String(noiseNow)} color={theme.ring2} />
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
