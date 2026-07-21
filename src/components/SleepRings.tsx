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
        transform={`rotate(-90, ${center}, ${center})`}
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
  goalLabel?: string; // text under/next to the % label
  labelPercent?: number; // value for the % label (defaults to sleepPercent)
  labelBelow?: boolean; // render the % label under the rings instead of inside
}

export default function SleepRings({ sleepPercent, qualityPercent, deepPercent, theme, size = 220, goalLabel, labelPercent, labelBelow }: Props) {
  const isSmall = size < 100;
  const isMedium = !isSmall && size < 180;
  const sw = isSmall ? 4 : isMedium ? 9 : 12;
  const gap = isSmall ? 7 : isMedium ? 13 : 18;
  const center = size / 2;
  const outerR = center - (isSmall ? 4 : isMedium ? 8 : 20);
  const midR = outerR - gap;
  const innerR = midR - gap;

  return (
    <View style={{ width: size, height: labelBelow ? undefined : size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Ring radius={outerR} percent={sleepPercent} color={theme.ring1} glowColor={theme.ring1Glow} strokeWidth={sw} delay={0} center={center} />
        <Ring radius={midR} percent={qualityPercent} color={theme.ring2} glowColor={theme.ring2Glow} strokeWidth={sw} delay={150} center={center} />
        <Ring radius={innerR} percent={deepPercent} color={theme.ring3} glowColor={theme.ring3Glow} strokeWidth={sw} delay={300} center={center} />
      </Svg>
      {!isSmall && (
        <View style={labelBelow ? { alignItems: 'center', marginTop: 8, flexDirection: 'row', gap: 6, alignSelf: 'center' } : { position: 'absolute', alignItems: 'center' }}>
          <Text style={{
            fontSize: size > 200 ? 32 : 22,
            fontWeight: '700',
            color: theme.text,
          }}>
            {Math.round(labelPercent ?? sleepPercent)}%
          </Text>
          <Text style={{
            fontSize: size > 200 ? 12 : 10,
            color: theme.text,
            opacity: 0.85,
            fontWeight: '600',
            marginTop: 2,
            letterSpacing: 0.5,
          }}>
            {goalLabel ?? 'overall rating'}
          </Text>
        </View>
      )}
    </View>
  );
}
