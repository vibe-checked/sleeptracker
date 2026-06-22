import React from 'react';
import { View, Text, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { SleepTag } from '../data/types';
import { TAG_LIBRARY } from '../data/types';
import type { Theme } from '../themes/themes';

interface Props {
  selected: SleepTag[];
  onChange: (tags: SleepTag[]) => void;
  theme: Theme;
}

export default function TagSelector({ selected, onChange, theme }: Props) {
  const isOn = (id: string) => selected.some(t => t.id === id);

  const toggle = (tag: SleepTag) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isOn(tag.id)) {
      onChange(selected.filter(t => t.id !== tag.id));
    } else {
      onChange([...selected, tag]);
    }
  };

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {TAG_LIBRARY.map(tag => {
        const on = isOn(tag.id);
        return (
          <Pressable
            key={tag.id}
            onPress={() => toggle(tag)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: on ? theme.accent : theme.cardBorder,
              backgroundColor: on ? theme.accentDim : 'transparent',
            }}
          >
            <Text style={{ fontSize: 13 }}>{tag.icon}</Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: on ? theme.accent : theme.textDim }}>
              {tag.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
