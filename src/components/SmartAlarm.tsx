import React from 'react';
import { View, Text, Pressable, Switch } from 'react-native';
import * as Haptics from 'expo-haptics';
import Card from './Card';
import { useTheme } from '../themes/ThemeContext';
import { useSleepData } from '../data/SleepDataContext';

export default function SmartAlarm() {
  const { theme } = useTheme();
  const { smartAlarm, setSmartAlarm } = useSleepData();
  const { enabled, wakeHour, wakeMin, windowMin } = smartAlarm;

  const formatTime = (h: number, m: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const windowStart = new Date(2024, 0, 1, wakeHour, wakeMin - windowMin);
  const startLabel = formatTime(windowStart.getHours(), windowStart.getMinutes());

  const setEnabled = (v: boolean) => setSmartAlarm({ ...smartAlarm, enabled: v });
  const setWindowMin = (w: number) => setSmartAlarm({ ...smartAlarm, windowMin: w });

  // Bump hour or minute with wraparound, persisting the new config.
  const bump = (field: 'wakeHour' | 'wakeMin', max: number, step: number, dir: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const v = smartAlarm[field];
    setSmartAlarm({ ...smartAlarm, [field]: (v + dir * step + max) % max });
  };

  return (
    <Card delay={300}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <View>
          <Text style={{ fontSize: 11, color: theme.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '600' }}>
            Smart Alarm
          </Text>
          <Text style={{ fontSize: 13, color: theme.textDim, marginTop: 3 }}>
            Wakes you during light sleep
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={(v) => {
            setEnabled(v);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }}
          trackColor={{ false: theme.textMuted, true: theme.accent }}
          thumbColor="#fff"
        />
      </View>

      {enabled && (
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 18 }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 10, color: theme.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Hour</Text>
              <Pressable onPress={() => bump('wakeHour', 24, 1, 1)} style={arrowStyle(theme)}>
                <Text style={{ color: theme.textMuted, fontSize: 10 }}>▲</Text>
              </Pressable>
              <Text style={{ fontSize: 40, fontWeight: '700', color: theme.text, width: 56, textAlign: 'center', marginVertical: 4 }}>
                {wakeHour.toString().padStart(2, '0')}
              </Text>
              <Pressable onPress={() => bump('wakeHour', 24, 1, -1)} style={arrowStyle(theme)}>
                <Text style={{ color: theme.textMuted, fontSize: 10 }}>▼</Text>
              </Pressable>
            </View>

            <Text style={{ fontSize: 40, fontWeight: '700', color: theme.textMuted, marginTop: 16 }}>:</Text>

            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 10, color: theme.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Min</Text>
              <Pressable onPress={() => bump('wakeMin', 60, 5, 1)} style={arrowStyle(theme)}>
                <Text style={{ color: theme.textMuted, fontSize: 10 }}>▲</Text>
              </Pressable>
              <Text style={{ fontSize: 40, fontWeight: '700', color: theme.text, width: 56, textAlign: 'center', marginVertical: 4 }}>
                {wakeMin.toString().padStart(2, '0')}
              </Text>
              <Pressable onPress={() => bump('wakeMin', 60, 5, -1)} style={arrowStyle(theme)}>
                <Text style={{ color: theme.textMuted, fontSize: 10 }}>▼</Text>
              </Pressable>
            </View>
          </View>

          <Text style={{ fontSize: 11, color: theme.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
            Smart Window
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            {[15, 30, 45].map(w => (
              <Pressable
                key={w}
                onPress={() => { setWindowMin(w); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: windowMin === w ? theme.accent : theme.cardBorder,
                  backgroundColor: windowMin === w ? theme.accentDim : 'transparent',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: windowMin === w ? theme.accent : theme.textDim }}>
                  {w} min
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={{ backgroundColor: theme.accentDim, borderRadius: 12, padding: 10, alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: theme.textDim }}>
              Alarm window: {startLabel} – {formatTime(wakeHour, wakeMin)}
            </Text>
          </View>
        </View>
      )}
    </Card>
  );
}

function arrowStyle(theme: { cardBorder: string }) {
  return {
    borderWidth: 1,
    borderColor: theme.cardBorder,
    borderRadius: 8,
    width: 36,
    height: 24,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };
}
