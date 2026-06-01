import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
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
}

export default function GaugeRing({ value, size, color, label }: Props) {
  const { theme } = useTheme();
  const r = size / 2 - 6;
  const circ = 2 * Math.PI * r;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      300,
      withTiming(Math.min(value, 100) / 100, {
        duration: 1500,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
      })
    );
  }, [value]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circ - circ * progress.value,
  }));

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5} opacity={0.12} />
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray={`${circ}`}
            animatedProps={animatedProps}
            rotation={-90}
            origin={`${size / 2}, ${size / 2}`}
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
