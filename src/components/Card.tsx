import React from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTheme } from '../themes/ThemeContext';

interface Props {
  children: React.ReactNode;
  delay?: number;
  style?: ViewStyle;
}

export default function Card({ children, delay = 0, style }: Props) {
  const { theme } = useTheme();

  return (
    <Animated.View
      entering={FadeInUp.delay(delay).duration(500)}
      style={[
        {
          backgroundColor: theme.cardBg,
          borderColor: theme.cardBorder,
          borderWidth: 1,
          borderRadius: 20,
          padding: 20,
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}
