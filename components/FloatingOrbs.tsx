import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { Colors } from '@/constants/colors';

const { width, height } = Dimensions.get('window');

interface OrbProps {
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  amplitude: number;
}

function Orb({ x, y, size, color, delay, duration, amplitude }: OrbProps) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 1200 }));
    scale.value = withDelay(delay, withTiming(1, { duration: 1200 }));

    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-amplitude, { duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(amplitude * 0.5, { duration: duration * 0.8, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );

    translateX.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(amplitude * 0.3, { duration: duration * 1.3, easing: Easing.inOut(Easing.sin) }),
          withTiming(-amplitude * 0.4, { duration: duration * 0.9, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        animStyle,
        {
          position: 'absolute',
          left: x - size / 2,
          top: y - size / 2,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
      ]}
    />
  );
}

const ORBS: OrbProps[] = [
  {
    x: width * 0.15,
    y: height * 0.15,
    size: 180,
    color: 'rgba(255, 45, 135, 0.12)',
    delay: 0,
    duration: 5000,
    amplitude: 24,
  },
  {
    x: width * 0.85,
    y: height * 0.2,
    size: 220,
    color: 'rgba(123, 47, 255, 0.1)',
    delay: 300,
    duration: 6200,
    amplitude: 20,
  },
  {
    x: width * 0.5,
    y: height * 0.55,
    size: 300,
    color: 'rgba(168, 85, 247, 0.07)',
    delay: 600,
    duration: 7500,
    amplitude: 16,
  },
  {
    x: width * 0.1,
    y: height * 0.7,
    size: 160,
    color: 'rgba(255, 107, 179, 0.09)',
    delay: 200,
    duration: 5800,
    amplitude: 22,
  },
  {
    x: width * 0.9,
    y: height * 0.75,
    size: 200,
    color: 'rgba(255, 45, 135, 0.08)',
    delay: 900,
    duration: 6800,
    amplitude: 18,
  },
  {
    x: width * 0.6,
    y: height * 0.1,
    size: 120,
    color: 'rgba(123, 47, 255, 0.13)',
    delay: 150,
    duration: 4800,
    amplitude: 28,
  },
];

export default function FloatingOrbs() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {ORBS.map((orb, i) => (
        <Orb key={i} {...orb} />
      ))}
    </View>
  );
}
