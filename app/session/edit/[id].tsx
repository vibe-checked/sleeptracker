import React, { useState } from 'react';
import { ScrollView, View, Text, Pressable, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Card from '../../../src/components/Card';
import TagSelector from '../../../src/components/TagSelector';
import { useTheme } from '../../../src/themes/ThemeContext';
import { useSleepData } from '../../../src/data/SleepDataContext';
import type { SleepTag } from '../../../src/data/types';

const EMOJI_CHOICES = ['😴', '😊', '🥱', '💤', '😌', '🌙', '✨', '😐', '🙂', '😪', '😩', '🤩'];

function parseTime(t: string): { h: number; m: number } {
  const [h, m] = t.split(':').map(Number);
  return { h: h || 0, m: m || 0 };
}
function fmtTime(h: number, m: number): string {
  return `${h}:${m.toString().padStart(2, '0')}`;
}

function arrowStyle(borderColor: string) {
  return {
    borderWidth: 1,
    borderColor,
    borderRadius: 8,
    width: 36,
    height: 26,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };
}

export default function SessionEditScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getById, updateSession } = useSleepData();
  const day = getById(id);

  const initBed = day ? parseTime(day.bedtime) : { h: 22, m: 30 };
  const initWake = day ? parseTime(day.wakeTime) : { h: 7, m: 0 };

  const [bedH, setBedH] = useState(initBed.h);
  const [bedM, setBedM] = useState(initBed.m);
  const [wakeH, setWakeH] = useState(initWake.h);
  const [wakeM, setWakeM] = useState(initWake.m);
  const [emoji, setEmoji] = useState(day?.emoji ?? '😴');
  const [note, setNote] = useState(day?.note ?? '');
  const [tags, setTags] = useState<SleepTag[]>(day?.tags ?? []);

  if (!day) {
    return (
      <LinearGradient colors={theme.bgGradientColors} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 }}>
        <Text style={{ color: theme.text }}>Session not found</Text>
        <Pressable onPress={() => router.back()} style={{ paddingVertical: 10, paddingHorizontal: 24, borderRadius: 14, backgroundColor: theme.accent }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#000' }}>Go Back</Text>
        </Pressable>
      </LinearGradient>
    );
  }

  const bump = (setter: React.Dispatch<React.SetStateAction<number>>, max: number, step: number, dir: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setter(v => (v + dir * step + max) % max);
  };

  const save = () => {
    // The bed→wake window must be able to contain the recorded sleep;
    // otherwise the stats become impossible (e.g. 8h sleep in a 2h window).
    let windowMin = wakeH * 60 + wakeM - (bedH * 60 + bedM);
    if (windowMin <= 0) windowMin += 24 * 60;
    const neededMin = day.totalMinutes + day.awakeMinutes;
    if (windowMin < neededMin) {
      Alert.alert(
        'Times don’t fit the recorded sleep',
        `This night has ${Math.floor(neededMin / 60)}h ${neededMin % 60}m of recorded sleep and awake time, but the times you set leave only ${Math.floor(windowMin / 60)}h ${windowMin % 60}m between bedtime and wake-up. Adjust the times so the window is at least that long.`
      );
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateSession(id, {
      bedtime: fmtTime(bedH, bedM),
      wakeTime: fmtTime(wakeH, wakeM),
      emoji,
      note,
      tags,
    });
    router.back();
  };

  const TimeStepper = ({ label, h, m, onH, onM }: { label: string; h: number; m: number; onH: (d: number) => void; onM: (d: number) => void }) => (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ fontSize: 10, color: theme.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <View style={{ alignItems: 'center' }}>
          <Pressable onPress={() => onH(1)} style={arrowStyle(theme.cardBorder)}><Text style={{ color: theme.textMuted, fontSize: 10 }}>▲</Text></Pressable>
          <Text style={{ fontSize: 30, fontWeight: '700', color: theme.text, width: 46, textAlign: 'center', marginVertical: 3 }}>{h.toString().padStart(2, '0')}</Text>
          <Pressable onPress={() => onH(-1)} style={arrowStyle(theme.cardBorder)}><Text style={{ color: theme.textMuted, fontSize: 10 }}>▼</Text></Pressable>
        </View>
        <Text style={{ fontSize: 30, fontWeight: '700', color: theme.textMuted, marginBottom: 4 }}>:</Text>
        <View style={{ alignItems: 'center' }}>
          <Pressable onPress={() => onM(1)} style={arrowStyle(theme.cardBorder)}><Text style={{ color: theme.textMuted, fontSize: 10 }}>▲</Text></Pressable>
          <Text style={{ fontSize: 30, fontWeight: '700', color: theme.text, width: 46, textAlign: 'center', marginVertical: 3 }}>{m.toString().padStart(2, '0')}</Text>
          <Pressable onPress={() => onM(-1)} style={arrowStyle(theme.cardBorder)}><Text style={{ color: theme.textMuted, fontSize: 10 }}>▼</Text></Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <LinearGradient colors={theme.bgGradientColors} style={{ flex: 1 }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <View>
              <Text style={{ fontSize: 11, color: theme.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '600' }}>Edit Session</Text>
              <Text style={{ fontSize: 24, fontWeight: '700', color: theme.text, marginTop: 2 }}>{day.dayLabel}, {day.date}</Text>
            </View>
            <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: theme.textDim, fontSize: 16 }}>✕</Text>
            </Pressable>
          </View>

          {/* Times */}
          <Card delay={50}>
            <Text style={{ fontSize: 11, color: theme.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '600', marginBottom: 14 }}>Times</Text>
            <View style={{ flexDirection: 'row' }}>
              <TimeStepper label="Bedtime" h={bedH} m={bedM} onH={d => bump(setBedH, 24, 1, d)} onM={d => bump(setBedM, 60, 5, d)} />
              <TimeStepper label="Wake" h={wakeH} m={wakeM} onH={d => bump(setWakeH, 24, 1, d)} onM={d => bump(setWakeM, 60, 5, d)} />
            </View>
          </Card>

          <View style={{ height: 12 }} />

          {/* Emoji */}
          <Card delay={100}>
            <Text style={{ fontSize: 11, color: theme.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '600', marginBottom: 12 }}>Mood</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {EMOJI_CHOICES.map(e => (
                <Pressable
                  key={e}
                  onPress={() => { setEmoji(e); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={{ width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: emoji === e ? theme.accent : theme.cardBorder, backgroundColor: emoji === e ? theme.accentDim : 'transparent', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ fontSize: 22 }}>{e}</Text>
                </Pressable>
              ))}
            </View>
          </Card>

          <View style={{ height: 12 }} />

          {/* Tags */}
          <Card delay={150}>
            <Text style={{ fontSize: 11, color: theme.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '600', marginBottom: 12 }}>Tags</Text>
            <TagSelector selected={tags} onChange={setTags} theme={theme} />
          </Card>

          <View style={{ height: 12 }} />

          {/* Note */}
          <Card delay={200}>
            <Text style={{ fontSize: 11, color: theme.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '600', marginBottom: 12 }}>Note</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="How did you sleep?"
              placeholderTextColor={theme.textMuted}
              multiline
              style={{ fontSize: 14, color: theme.text, minHeight: 60, textAlignVertical: 'top' }}
            />
          </Card>

          <View style={{ height: 20 }} />

          <Pressable onPress={save} style={{ paddingVertical: 16, borderRadius: 16, backgroundColor: theme.accent, alignItems: 'center' }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#000' }}>Save Changes</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
