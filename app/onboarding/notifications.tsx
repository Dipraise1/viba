import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  interpolate,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import GradientButton from '@/components/GradientButton';

const { width } = Dimensions.get('window');

function AnimatedBell() {
  const ring = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const pulse1 = useSharedValue(0);
  const pulse2 = useSharedValue(0);
  const pulse3 = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 10, stiffness: 80 });

    // Bell ring oscillation
    const ringBell = () => {
      ring.value = withSequence(
        withTiming(-12, { duration: 80 }),
        withTiming(12, { duration: 80 }),
        withTiming(-8, { duration: 80 }),
        withTiming(8, { duration: 80 }),
        withTiming(-4, { duration: 80 }),
        withTiming(4, { duration: 80 }),
        withTiming(0, { duration: 80 })
      );
    };
    ringBell();
    const interval = setInterval(ringBell, 3000);

    // Pulse rings
    const startPulse = (sv: typeof pulse1, delay: number) => {
      sv.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 1400, easing: Easing.out(Easing.ease) }),
            withTiming(0, { duration: 0 })
          ),
          -1,
          false
        )
      );
    };
    startPulse(pulse1, 0);
    startPulse(pulse2, 500);
    startPulse(pulse3, 1000);

    return () => clearInterval(interval);
  }, []);

  const bellStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${ring.value}deg` },
    ],
  }));

  const p1Style = useAnimatedStyle(() => ({
    opacity: interpolate(pulse1.value, [0, 0.5, 1], [0.4, 0.15, 0]),
    transform: [{ scale: interpolate(pulse1.value, [0, 1], [1, 2.2]) }],
  }));
  const p2Style = useAnimatedStyle(() => ({
    opacity: interpolate(pulse2.value, [0, 0.5, 1], [0.4, 0.15, 0]),
    transform: [{ scale: interpolate(pulse2.value, [0, 1], [1, 2.2]) }],
  }));
  const p3Style = useAnimatedStyle(() => ({
    opacity: interpolate(pulse3.value, [0, 0.5, 1], [0.4, 0.15, 0]),
    transform: [{ scale: interpolate(pulse3.value, [0, 1], [1, 2.2]) }],
  }));

  return (
    <View style={bellStyles.container}>
      {/* Pulse rings */}
      <Animated.View style={[bellStyles.pulseRing, p3Style]} />
      <Animated.View style={[bellStyles.pulseRing, p2Style]} />
      <Animated.View style={[bellStyles.pulseRing, p1Style]} />

      {/* Glow */}
      <View style={bellStyles.glow} />

      {/* Bell icon */}
      <Animated.View style={[bellStyles.iconWrap, bellStyle]}>
        <LinearGradient
          colors={['#FF2D87', '#7B2FFF']}
          style={bellStyles.iconBg}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="notifications" size={42} color="#FFFFFF" />
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const bellStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 160,
    height: 160,
  },
  pulseRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: Colors.pink,
  },
  glow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.pink,
    opacity: 0.12,
    shadowColor: Colors.pink,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 10,
  },
  iconWrap: {
    zIndex: 2,
  },
  iconBg: {
    width: 100,
    height: 100,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.pink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
});

// Notification preview cards
function NotifPreview({ icon, text, delay }: { icon: string; text: string; delay: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(500).springify()} style={notifStyles.card}>
      <LinearGradient
        colors={[Colors.bgGlass, Colors.bgGlass]}
        style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
      />
      <View style={notifStyles.iconWrap}>
        <Text style={notifStyles.icon}>{icon}</Text>
      </View>
      <Text style={notifStyles.text}>{text}</Text>
    </Animated.View>
  );
}

const notifStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.pinkDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 18 },
  text: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
});

export default function NotificationsScreen() {
  const handleEnable = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/onboarding/ready');
  };

  const handleSkip = () => {
    router.push('/onboarding/ready');
  };

  return (
    <View style={styles.container}>
      {/* Right side glow */}
      <View style={styles.rightGlow} pointerEvents="none" />

      {/* Nav */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.topNav}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.stepPill}>
          <Text style={styles.stepText}>4 of 5</Text>
        </View>
      </Animated.View>

      <View style={styles.content}>
        {/* Bell */}
        <Animated.View entering={FadeInDown.delay(200).duration(700).springify()} style={styles.bellWrap}>
          <AnimatedBell />
        </Animated.View>

        {/* Text */}
        <Animated.Text entering={FadeInDown.delay(400).duration(600)} style={styles.title}>
          Never Miss a Gift
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(520).duration(600)} style={styles.subtitle}>
          Get notified about gifts, new followers, and when your co-hosts go live.
        </Animated.Text>

        {/* Preview notifications */}
        <Animated.View entering={FadeInDown.delay(620).duration(500)} style={styles.previewList}>
          <NotifPreview icon="🎁" text="@nova_rose sent you 10 Roses on TikTok" delay={680} />
          <NotifPreview icon="🔴" text="@jaystreams went live — join as co-host?" delay={760} />
          <NotifPreview icon="⭐" text="You received 50 Stars on Facebook Live" delay={840} />
        </Animated.View>

        {/* CTAs */}
        <Animated.View entering={FadeInUp.delay(900).duration(500)} style={styles.ctaContainer}>
          <GradientButton
            label="Enable Notifications"
            onPress={handleEnable}
            size="large"
          />
          <TouchableOpacity onPress={handleSkip} style={styles.laterBtn} activeOpacity={0.7}>
            <Text style={styles.laterText}>Maybe Later</Text>
          </TouchableOpacity>
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
  rightGlow: {
    position: 'absolute',
    top: 100,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: Colors.pink,
    opacity: 0.06,
    shadowColor: Colors.pink,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 80,
    elevation: 0,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.bgGlass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepPill: {
    backgroundColor: Colors.bgGlass,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: Colors.textMuted,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  bellWrap: {
    marginBottom: 32,
  },
  title: {
    fontFamily: 'Syne-ExtraBold',
    fontSize: 34,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 14,
  },
  subtitle: {
    fontFamily: 'DMSans-Regular',
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 300,
    marginBottom: 32,
  },
  previewList: {
    width: '100%',
    gap: 10,
    marginBottom: 44,
  },
  ctaContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  laterBtn: {
    paddingVertical: 8,
  },
  laterText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 15,
    color: Colors.textMuted,
  },
});
