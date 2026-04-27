import React, { useCallback } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '@/constants/colors';

interface GradientButtonProps {
  label: string;
  onPress: () => void;
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'outline' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function GradientButton({
  label,
  onPress,
  size = 'medium',
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  fullWidth = true,
}: GradientButtonProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
    opacity.value = withTiming(0.88, { duration: 80 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
    opacity.value = withTiming(1, { duration: 100 });
  }, []);

  const { height, paddingHorizontal, fontSize, borderRadius } = SIZE_MAP[size];

  if (variant === 'outline') {
    return (
      <AnimatedTouchable
        style={[
          animatedStyle,
          styles.outlineBtn,
          {
            height,
            paddingHorizontal,
            borderRadius,
            width: fullWidth ? '100%' : undefined,
            opacity: disabled ? 0.4 : 1,
          },
          style,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={1}
      >
        <Text style={[styles.outlineLabel, { fontSize }]}>{label}</Text>
      </AnimatedTouchable>
    );
  }

  if (variant === 'ghost') {
    return (
      <AnimatedTouchable
        style={[
          animatedStyle,
          styles.ghostBtn,
          {
            height,
            paddingHorizontal,
            borderRadius,
            width: fullWidth ? '100%' : undefined,
          },
          style,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={1}
      >
        <Text style={[styles.ghostLabel, { fontSize }]}>{label}</Text>
      </AnimatedTouchable>
    );
  }

  return (
    <AnimatedTouchable
      style={[
        animatedStyle,
        {
          width: fullWidth ? '100%' : undefined,
          borderRadius,
          overflow: 'hidden',
          opacity: disabled ? 0.4 : 1,
          shadowColor: Colors.pink,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: disabled ? 0 : 0.4,
          shadowRadius: 16,
          elevation: disabled ? 0 : 8,
        },
        style,
      ]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={1}
    >
      <LinearGradient
        colors={disabled ? ['#444', '#333'] : ['#FF2D87', '#A855F7', '#7B2FFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.gradientFill, { height, paddingHorizontal, borderRadius }]}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={[styles.label, { fontSize }]}>{label}</Text>
        )}
      </LinearGradient>
    </AnimatedTouchable>
  );
}

const SIZE_MAP = {
  small: { height: 40, paddingHorizontal: 20, fontSize: 14, borderRadius: 20 },
  medium: { height: 50, paddingHorizontal: 24, fontSize: 15, borderRadius: 25 },
  large: { height: 58, paddingHorizontal: 32, fontSize: 17, borderRadius: 29 },
};

const styles = StyleSheet.create({
  gradientFill: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'Syne-Bold',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  outlineBtn: {
    borderWidth: 1.5,
    borderColor: Colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.pinkDim,
  },
  outlineLabel: {
    fontFamily: 'Syne-Bold',
    color: Colors.pink,
    letterSpacing: 0.3,
  },
  ghostBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostLabel: {
    fontFamily: 'DMSans-Medium',
    color: Colors.textSecondary,
  },
});
