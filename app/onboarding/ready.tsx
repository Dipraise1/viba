import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
  interpolate,
  FadeInDown,
  FadeInUp,
  ZoomIn,
  Easing,
} from 'react-native-reanimated';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import GradientButton from '@/components/GradientButton';

const { width, height } = Dimensions.get('window');

// --- Confetti particle ---
interface ConfettiProps {
  x: number;
  color: string;
  delay: number;
  size: number;
  shape: 'circle' | 'square' | 'bar';
}

function ConfettiPiece({ x, color, delay, size, shape }: ConfettiProps) {
  const translateY = useSharedValue(-20);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const drift = (Math.random() - 0.5) * 60;
    translateY.value = withDelay(
      delay,
      withTiming(height * 0.6, {
        duration: 2000 + Math.random() * 1000,
        easing: Easing.out(Easing.quad),
      })
    );
    translateX.value = withDelay(
      delay,
      withTiming(drift, { duration: 2500 })
    );
    rotate.value = withDelay(
      delay,
      withTiming(360 * (Math.random() > 0.5 ? 1 : -1) * 3, { duration: 2500 })
    );
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 100 }),
        withDelay(1600, withTiming(0, { duration: 600 }))
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    top: 0,
    left: x,
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  const shapeStyle =
    shape === 'circle'
      ? { width: size, height: size, borderRadius: size / 2, backgroundColor: color }
      : shape === 'bar'
      ? { width: size * 0.4, height: size * 1.4, borderRadius: 2, backgroundColor: color }
      : { width: size, height: size, borderRadius: 3, backgroundColor: color };

  return <Animated.View style={[style, shapeStyle]} />;
}

function ConfettiExplosion() {
  const COLORS = [
    Colors.pink, Colors.pinkLight, Colors.purple, Colors.purpleLight,
    '#FFB800', '#FFFFFF', '#FF6BB3', '#00D97E',
  ];
  const SHAPES: ConfettiProps['shape'][] = ['circle', 'square', 'bar'];

  const pieces = Array.from({ length: 60 }).map((_, i) => ({
    id: i,
    x: Math.random() * width,
    color: COLORS[i % COLORS.length],
    delay: Math.random() * 600,
    size: 6 + Math.random() * 8,
    shape: SHAPES[i % SHAPES.length],
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((p) => (
        <ConfettiPiece key={p.id} {...p} />
      ))}
    </View>
  );
}

// --- Dashboard mockup ---
function DashboardMockup() {
  return (
    <Animated.View entering={FadeInUp.delay(900).duration(700).springify()} style={mockStyles.container}>
      <LinearGradient
        colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
        style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
      />

      {/* Top bar */}
      <View style={mockStyles.topBar}>
        <View style={mockStyles.livePill}>
          <View style={mockStyles.liveDot} />
          <Text style={mockStyles.liveLabel}>LIVE</Text>
        </View>
        <Text style={mockStyles.viewCount}>1.2K watching</Text>
        <View style={mockStyles.platformPills}>
          {['tiktok', 'instagram', 'youtube'].map((p) => (
            <View key={p} style={mockStyles.platformDot}>
              <FontAwesome5 name={p} size={8} color="#FFFFFF" solid />
            </View>
          ))}
        </View>
      </View>

      {/* Comment feed preview */}
      <View style={mockStyles.commentFeed}>
        {[
          { icon: 'gift', text: '@user sent Rose x5', color: Colors.pink },
          { icon: 'comment', text: '@jay: this is amazing!!', color: Colors.textSecondary },
          { icon: 'star', text: '@maya sent 20 Stars', color: Colors.gold },
        ].map((c, i) => (
          <View key={i} style={mockStyles.commentRow}>
            <FontAwesome5 name={c.icon} size={11} color={c.color} solid />
            <Text style={[mockStyles.commentText, { color: c.color }]} numberOfLines={1}>
              {c.text}
            </Text>
          </View>
        ))}
      </View>

      {/* Stats row */}
      <View style={mockStyles.statsRow}>
        {[
          { label: 'Gifts', value: '$47' },
          { label: 'Comments', value: '342' },
          { label: 'Follows', value: '+128' },
        ].map((s) => (
          <View key={s.label} style={mockStyles.stat}>
            <Text style={mockStyles.statValue}>{s.value}</Text>
            <Text style={mockStyles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const mockStyles = StyleSheet.create({
  container: {
    width: width - 56,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 12,
    overflow: 'hidden',
    backgroundColor: Colors.bgCard,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.pink,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    opacity: 0.9,
  },
  liveLabel: {
    fontFamily: 'Syne-Bold',
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  viewCount: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
  platformPills: {
    flexDirection: 'row',
    gap: 4,
  },
  platformDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.bgGlass,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentFeed: {
    gap: 6,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentEmoji: { fontSize: 12 },
  commentText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: 'Syne-Bold',
    fontSize: 16,
    color: Colors.textPrimary,
  },
  statLabel: {
    fontFamily: 'DMSans-Regular',
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
});

export default function ReadyScreen() {
  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <ConfettiExplosion />

      {/* Background glow */}
      <LinearGradient
        colors={['rgba(255,45,135,0.08)', 'transparent', 'rgba(123,47,255,0.1)']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        pointerEvents="none"
      />

      <View style={styles.content}>
        {/* Success mark */}
        <Animated.View entering={ZoomIn.delay(300).duration(600).springify()} style={styles.successWrap}>
          <LinearGradient
            colors={['#FF2D87', '#7B2FFF']}
            style={styles.successCircle}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="checkmark" size={40} color="#FFFFFF" />
          </LinearGradient>
          <View style={styles.successGlow} />
        </Animated.View>

        {/* Title */}
        <Animated.Text entering={FadeInDown.delay(500).duration(600)} style={styles.title}>
          You're all set!
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(620).duration(600)} style={styles.subtitle}>
          Your first live is one tap away.{'\n'}The world is waiting for you.
        </Animated.Text>

        {/* Dashboard preview */}
        <Animated.View entering={FadeInDown.delay(750).duration(600)} style={styles.previewLabel}>
          <Text style={styles.previewLabelText}>Here's what your dashboard looks like</Text>
        </Animated.View>
        <DashboardMockup />

        {/* CTA */}
        <Animated.View entering={FadeInUp.delay(1000).duration(600)} style={styles.ctaWrap}>
          <GradientButton
            label="Start Streaming"
            onPress={handleStart}
            size="large"
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgDeep,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 80,
    paddingBottom: 48,
  },
  successWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  successCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    shadowColor: Colors.pink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  successGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.pink,
    opacity: 0.15,
    shadowColor: Colors.pink,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 0,
  },
  title: {
    fontFamily: 'Syne-ExtraBold',
    fontSize: 36,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: 'DMSans-Regular',
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 32,
  },
  previewLabel: {
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  previewLabelText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: 0.3,
  },
  ctaWrap: {
    width: '100%',
    marginTop: 28,
  },
});
