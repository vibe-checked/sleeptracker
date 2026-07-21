import React, { useState } from 'react';
import { ScrollView, View, Text, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import Card from '../../src/components/Card';
import SmartAlarm from '../../src/components/SmartAlarm';
import { useTheme } from '../../src/themes/ThemeContext';
import { themes, type ThemeName } from '../../src/themes/themes';
import { exportSleepData, formatMinutes } from '../../src/data/mockData';
import { useSleepData } from '../../src/data/SleepDataContext';
import type { SleepGoals } from '../../src/data/types';

export default function SettingsScreen() {
  const { theme, themeName, setThemeName } = useTheme();
  const { sessions, goals, setGoals, dataSource, healthAvailable, connectHealth, syncFromHealth, seedHealthSample } = useSleepData();
  const [exported, setExported] = useState(false);
  const [healthBusy, setHealthBusy] = useState(false);

  const bumpGoal = (key: keyof SleepGoals, delta: number, min: number, max: number) => {
    const next = Math.max(min, Math.min(max, goals[key] + delta));
    setGoals({ ...goals, [key]: next });
  };

  const handleConnectHealth = async () => {
    setHealthBusy(true);
    try {
      const { authorized, imported } = await connectHealth();
      if (!authorized) Alert.alert('Apple Health', 'Permission was not granted. Enable Health access in Settings to import your sleep data.');
      else Alert.alert('Apple Health', imported > 0 ? `Connected — imported ${imported} night${imported === 1 ? '' : 's'}.` : 'Connected, but no sleep data was found yet. Wear your Apple Watch to bed, then Sync.');
    } finally {
      setHealthBusy(false);
    }
  };

  const handleSyncHealth = async () => {
    setHealthBusy(true);
    try {
      const n = await syncFromHealth();
      Alert.alert('Apple Health', n > 0 ? `Synced ${n} night${n === 1 ? '' : 's'} from Health.` : 'No sleep data found in Health.');
    } finally {
      setHealthBusy(false);
    }
  };

  const handleSeedHealth = async () => {
    setHealthBusy(true);
    try {
      const ok = await seedHealthSample();
      if (ok) { const n = await syncFromHealth(); Alert.alert('Dev', `Wrote a sample night to Health and synced ${n}.`); }
      else Alert.alert('Dev', 'Could not write to Health (needs share permission).');
    } finally {
      setHealthBusy(false);
    }
  };

  const handleExport = async () => {
    try {
      const csv = exportSleepData(sessions);
      const { File, Paths } = require('expo-file-system');
      const file = new File(Paths.document, 'sleep-data.csv');
      if (file.exists) file.delete();
      file.create();
      file.write(csv);
      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Sleep Data',
        UTI: 'public.comma-separated-values-text',
      });
      setExported(true);
      setTimeout(() => setExported(false), 2000);
    } catch (e) {
      Alert.alert('Export Error', 'Could not export sleep data.');
    }
  };

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
              Settings
            </Text>
          </Animated.View>

          {/* Theme Picker */}
          <Card delay={100}>
            <Text style={{ fontSize: 11, color: theme.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '600', marginBottom: 14 }}>
              Theme
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {(Object.keys(themes) as ThemeName[]).map(name => {
                const t = themes[name];
                const active = name === themeName;
                return (
                  <Pressable
                    key={name}
                    onPress={() => setThemeName(name)}
                    style={{
                      flex: 1,
                      paddingVertical: 14,
                      paddingHorizontal: 10,
                      borderRadius: 14,
                      borderWidth: 2,
                      borderColor: active ? t.accent : t.cardBorder,
                      backgroundColor: t.bg,
                      alignItems: 'center',
                      position: 'relative',
                    }}
                  >
                    <View style={{ flexDirection: 'row', gap: 4, marginBottom: 6 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.ring1 }} />
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.ring2 }} />
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.ring3 }} />
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: t.text }}>{t.name}</Text>
                    {active && (
                      <View style={{
                        position: 'absolute', top: 5, right: 5,
                        width: 16, height: 16, borderRadius: 8,
                        backgroundColor: t.accent,
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Text style={{ fontSize: 9, color: '#000', fontWeight: '700' }}>✓</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </Card>

          <View style={{ height: 16 }} />

          {/* Apple Health */}
          <Card delay={350}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ fontSize: 11, color: theme.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '600' }}>
                Apple Health
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dataSource === 'healthkit' ? theme.positive : theme.textMuted }} />
                <Text style={{ fontSize: 12, color: dataSource === 'healthkit' ? theme.positive : theme.textDim, fontWeight: '600' }}>
                  {dataSource === 'healthkit' ? 'Connected' : 'Sample data'}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 13, color: theme.textDim, marginBottom: 14, lineHeight: 18 }}>
              {dataSource === 'healthkit'
                ? 'Showing your real sleep, heart rate, HRV, and respiratory data from Apple Health.'
                : 'Connect Apple Health to replace the sample data with your real Apple Watch sleep sessions.'}
            </Text>

            <Pressable
              onPress={dataSource === 'healthkit' ? handleSyncHealth : handleConnectHealth}
              disabled={healthBusy || !healthAvailable}
              style={{ paddingVertical: 13, borderRadius: 14, backgroundColor: healthAvailable ? theme.accent : theme.cardBorder, alignItems: 'center', opacity: healthBusy ? 0.6 : 1 }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: healthAvailable ? '#000' : theme.textMuted }}>
                {healthBusy ? 'Working…' : dataSource === 'healthkit' ? 'Sync from Health' : 'Connect Apple Health'}
              </Text>
            </Pressable>
            {!healthAvailable && (
              <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 8, textAlign: 'center' }}>
                Health data isn't available on this device.
              </Text>
            )}
            {__DEV__ && healthAvailable && (
              <Pressable onPress={handleSeedHealth} disabled={healthBusy} style={{ paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: theme.cardBorder, alignItems: 'center', marginTop: 8 }}>
                <Text style={{ fontSize: 12, color: theme.textDim }}>Dev: add a sample night to Health</Text>
              </Pressable>
            )}
          </Card>

          <View style={{ height: 16 }} />
          <SmartAlarm />

          <View style={{ height: 16 }} />

          {/* Sleep Goals (editable) */}
          <Card delay={400}>
            <Text style={{ fontSize: 11, color: theme.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '600', marginBottom: 6 }}>
              Sleep Goals
            </Text>
            {([
              { key: 'sleepGoal', label: 'Sleep Duration', display: formatMinutes(goals.sleepGoal), color: theme.ring1, step: 15, min: 240, max: 720 },
              { key: 'qualityGoal', label: 'Quality Target', display: `${goals.qualityGoal}%`, color: theme.ring2, step: 5, min: 50, max: 100 },
              { key: 'deepGoal', label: 'Deep Sleep', display: formatMinutes(goals.deepGoal), color: theme.ring3, step: 15, min: 30, max: 180 },
            ] as const).map((goal, i) => (
              <View
                key={goal.key}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 12,
                  borderBottomWidth: i < 2 ? 1 : 0,
                  borderBottomColor: theme.cardBorder,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: goal.color }} />
                  <Text style={{ fontSize: 14, color: theme.text }}>{goal.label}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Pressable
                    onPress={() => bumpGoal(goal.key, -goal.step, goal.min, goal.max)}
                    hitSlop={8}
                    style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: theme.cardBorder, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ fontSize: 16, color: theme.textDim, fontWeight: '700' }}>−</Text>
                  </Pressable>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: goal.color, width: 56, textAlign: 'center' }}>{goal.display}</Text>
                  <Pressable
                    onPress={() => bumpGoal(goal.key, goal.step, goal.min, goal.max)}
                    hitSlop={8}
                    style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: theme.cardBorder, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ fontSize: 16, color: theme.textDim, fontWeight: '700' }}>+</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </Card>

          <View style={{ height: 16 }} />

          {/* Export */}
          <Card delay={450}>
            <Text style={{ fontSize: 11, color: theme.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '600', marginBottom: 12 }}>
              Data
            </Text>
            <Pressable
              onPress={handleExport}
              style={{
                paddingVertical: 14,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.cardBorder,
                backgroundColor: exported ? theme.positive + '15' : theme.accentDim,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: exported ? theme.positive : theme.accent }}>
                {exported ? '✓ Exported' : '↓ Export Sleep Data (CSV)'}
              </Text>
            </Pressable>
            <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 8, textAlign: 'center' }}>
              Exports 14 days of sleep data including health metrics
            </Text>
          </Card>

          <View style={{ height: 16 }} />

          {/* Privacy */}
          <Card delay={475}>
            <Text style={{ fontSize: 11, color: theme.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '600', marginBottom: 10 }}>
              Privacy
            </Text>
            <Text style={{ fontSize: 13, color: theme.textDim, lineHeight: 19 }}>
              Your sleep and health data stays on this device. SleepTracker reads from Apple Health only with your permission and never uploads your data to any server.
            </Text>
            <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 10 }}>
              Questions? mark@vibecode.review
            </Text>
          </Card>

          <View style={{ height: 16 }} />

          {/* About */}
          <Card delay={500} style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: theme.text, marginBottom: 4 }}>
              SleepTracker
            </Text>
            <Text style={{ fontSize: 12, color: theme.textMuted }}>Version 1.0.0</Text>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
