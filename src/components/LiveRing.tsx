import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  size: number;
  color: string;
  glowColor: string;
  children?: React.ReactNode;
}

// A softly breathing ring used on the live-tracking screen.
export default function LiveRing({ size, color, glowColor, children }: Props) {
  const r = size / 2 - 14;
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const innerProps = useAnimatedProps(() => ({
    r: r * (0.62 + pulse.value * 0.06),
    opacity: 0.18 + pulse.value * 0.22,
  }));
  const ringProps = useAnimatedProps(() => ({
    opacity: 0.5 + pulse.value * 0.5,
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r + 6} fill="none" stroke={glowColor} strokeWidth={2} opacity={0.15} />
        <AnimatedCircle cx={size / 2} cy={size / 2} r={r} fill={color} animatedProps={innerProps} />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={3}
          animatedProps={ringProps}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>{children}</View>
    </View>
  );
}
