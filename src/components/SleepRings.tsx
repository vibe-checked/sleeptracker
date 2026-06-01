import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import type { Theme } from '../themes/themes';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface RingProps {
  radius: number;
  percent: number;
  color: string;
  glowColor: string;
  strokeWidth: number;
  delay: number;
  center: number;
}

function Ring({ radius, percent, color, glowColor, strokeWidth, delay, center }: RingProps) {
  const circumference = 2 * Math.PI * radius;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(Math.min(percent, 100) / 100, {
        duration: 1800,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
      })
    );
  }, [percent]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference - circumference * progress.value,
  }));

  return (
    <>
      <Circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={glowColor}
        strokeWidth={strokeWidth + 6}
        opacity={0.15}
      />
      <Circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        opacity={0.1}
      />
      <AnimatedCircle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={`${circumference}`}
        animatedProps={animatedProps}
        rotation={-90}
        origin={`${center}, ${center}`}
      />
    </>
  );
}

interface Props {
  sleepPercent: number;
  qualityPercent: number;
  deepPercent: number;
  theme: Theme;
  size?: number;
}

export default function SleepRings({ sleepPercent, qualityPercent, deepPercent, theme, size = 220 }: Props) {
  const isSmall = size < 100;
  const sw = isSmall ? 4 : 12;
  const gap = isSmall ? 7 : 18;
  const center = size / 2;
  const outerR = center - (isSmall ? 4 : 20);
  const midR = outerR - gap;
  const innerR = midR - gap;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Ring radius={outerR} percent={sleepPercent} color={theme.ring1} glowColor={theme.ring1Glow} strokeWidth={sw} delay={0} center={center} />
        <Ring radius={midR} percent={qualityPercent} color={theme.ring2} glowColor={theme.ring2Glow} strokeWidth={sw} delay={150} center={center} />
        <Ring radius={innerR} percent={deepPercent} color={theme.ring3} glowColor={theme.ring3Glow} strokeWidth={sw} delay={300} center={center} />
      </Svg>
      {!isSmall && (
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          <Text style={{
            fontSize: size > 200 ? 32 : 22,
            fontWeight: '700',
            color: theme.text,
          }}>
            {Math.round(sleepPercent)}%
          </Text>
          <Text style={{
            fontSize: size > 200 ? 11 : 9,
            color: theme.textDim,
            marginTop: 2,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
          }}>
            sleep goal
          </Text>
        </View>
      )}
    </View>
  );
}
