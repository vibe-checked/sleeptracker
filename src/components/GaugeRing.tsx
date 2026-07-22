import React, { useCallback } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useFocusEffect } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../themes/ThemeContext';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  value: number;
  size: number;
  color: string;
  label: string;
  // 'ring' = closed circle (default). 'gauge' = thinner speedometer-style
  // open arc with a gap at the bottom and rounded caps.
  variant?: 'ring' | 'gauge';
}

export default function GaugeRing({ value, size, color, label, variant = 'ring' }: Props) {
  const { theme } = useTheme();
  const r = size / 2 - 6;
  const circ = 2 * Math.PI * r;
  const isGauge = variant === 'gauge';
  const arcLen = isGauge ? circ * 0.75 : circ; // 270° sweep for the gauge
  const rotation = isGauge ? 135 : -90; // gauge: gap centered at the bottom
  const sw = isGauge ? 4 : 5;
  const progress = useSharedValue(0);

  useFocusEffect(useCallback(() => {
    progress.value = 0;
    progress.value = withDelay(
      300,
      withTiming(Math.min(value, 100) / 100, {
        duration: 1500,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]));

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: arcLen - arcLen * progress.value,
  }));

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={sw}
            opacity={0.14}
            strokeLinecap="round"
            strokeDasharray={isGauge ? `${arcLen} ${circ}` : undefined}
            transform={`rotate(${rotation}, ${size / 2}, ${size / 2})`}
          />
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeDasharray={`${arcLen} ${circ}`}
            animatedProps={animatedProps}
            transform={`rotate(${rotation}, ${size / 2}, ${size / 2})`}
          />
        </Svg>
        <View style={{ position: 'absolute' }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color, textAlign: 'center' }}>
            {value}
          </Text>
        </View>
      </View>
      <Text style={{ fontSize: 10, color: theme.textMuted, marginTop: 4, letterSpacing: 0.8, textTransform: 'uppercase' }}>
        {label}
      </Text>
    </View>
  );
}
