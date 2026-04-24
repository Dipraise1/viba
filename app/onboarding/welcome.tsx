import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import GradientButton from '@/components/GradientButton';

const { width, height } = Dimensions.get('window');

function LogoV() {
  const glowAnim = useSharedValue(0);

  useEffect(() => {
    glowAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glowAnim.value, [0, 1], [0.4, 1]),
    transform: [{ scale: interpolate(glowAnim.value, [0, 1], [1, 1.04]) }],
  }));

  return (
    <Animated.View style={[styles.logoContainer, glowStyle]}>
      <Image source={require('../../assets/logo.png')} style={styles.logoImage} resizeMode="contain" />
    </Animated.View>
  );
}

export default function WelcomeScreen() {
  const handleGetStarted = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/onboarding/features');
  };

  const handleSignIn = () => {
    Haptics.selectionAsync();
    router.push('/login');
  };

  return (
    <View style={styles.container}>
      {/* Mesh gradient overlay */}
      <LinearGradient
        colors={['rgba(123,47,255,0.15)', 'transparent', 'rgba(255,45,135,0.1)']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        pointerEvents="none"
      />

      <View style={styles.content}>
        {/* Logo */}
        <Animated.View entering={FadeInDown.delay(200).duration(800).springify()}>
          <LogoV />
          <Animated.Text
            entering={FadeInDown.delay(400).duration(600)}
            style={styles.brandName}
          >
            viba
          </Animated.Text>
        </Animated.View>

        {/* Tagline */}
        <Animated.View
          entering={FadeInDown.delay(600).duration(700)}
          style={styles.taglineContainer}
        >
          <Text style={styles.tagline}>Your Social World.</Text>
          <LinearGradient
            colors={['#FF2D87', '#A855F7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.taglineAccentBg}
          >
            <Text style={styles.taglineAccent}>One App.</Text>
          </LinearGradient>
        </Animated.View>

        <Animated.Text
          entering={FadeInDown.delay(750).duration(600)}
          style={styles.subtitle}
        >
          Connect TikTok, Instagram, YouTube, and more. Manage your entire social presence and go live across every platform — all from one place.
        </Animated.Text>

        {/* CTAs */}
        <Animated.View
          entering={FadeInUp.delay(900).duration(700)}
          style={styles.ctaContainer}
        >
          <GradientButton
            label="Get Started"
            onPress={handleGetStarted}
            size="large"
          />

          <TouchableOpacity onPress={handleSignIn} style={styles.signInBtn} activeOpacity={0.7}>
            <Text style={styles.signInText}>I already have an account</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Bottom fade */}
      <LinearGradient
        colors={['transparent', Colors.bg]}
        style={styles.bottomFade}
        pointerEvents="none"
      />
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
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 0,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoImage: {
    width: 200,
    height: 140,
  },
  brandName: {
    fontFamily: 'Syne-ExtraBold',
    fontSize: 38,
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 4,
    marginTop: 8,
  },
  taglineContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 16,
    gap: 4,
  },
  tagline: {
    fontFamily: 'Syne-Bold',
    fontSize: 32,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 40,
  },
  taglineAccentBg: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  taglineAccent: {
    fontFamily: 'Syne-ExtraBold',
    fontSize: 32,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'DMSans-Regular',
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
    marginBottom: 56,
  },
  ctaContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 20,
  },
  signInBtn: {
    paddingVertical: 8,
  },
  signInText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 15,
    color: Colors.textSecondary,
  },
  bottomFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
});
