import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';

// ─── Google "G" logo ──────────────────────────────────────────────────────────

function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      <Path fill="none" d="M0 0h48v48H0z"/>
    </Svg>
  );
}

// ─── Auth button ──────────────────────────────────────────────────────────────

function AuthButton({
  onPress,
  loading,
  children,
  variant = 'outline',
}: {
  onPress: () => void;
  loading?: boolean;
  children: React.ReactNode;
  variant?: 'outline' | 'gradient' | 'apple';
}) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    scale.value = withSequence(withSpring(0.96), withSpring(1));
    onPress();
  };

  if (variant === 'gradient') {
    return (
      <Animated.View style={[style, { width: '100%', borderRadius: 16, overflow: 'hidden' }]}>
        <TouchableOpacity onPress={handlePress} activeOpacity={0.85} disabled={loading}>
          <LinearGradient
            colors={['#FF2D87', '#7B2FFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={btnStyles.gradientInner}
          >
            {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : children}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  if (variant === 'apple') {
    return (
      <Animated.View style={[style, { width: '100%' }]}>
        <TouchableOpacity
          style={btnStyles.appleBtn}
          onPress={handlePress}
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : children}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[style, { width: '100%' }]}>
      <TouchableOpacity
        style={btnStyles.outlineBtn}
        onPress={handlePress}
        activeOpacity={0.85}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color={Colors.textPrimary} size="small" /> : children}
      </TouchableOpacity>
    </Animated.View>
  );
}

const btnStyles = StyleSheet.create({
  gradientInner: {
    width: '100%',
    paddingVertical: 17,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  outlineBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.borderBright,
  },
  appleBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
});

// ─── Divider ──────────────────────────────────────────────────────────────────

function OrDivider() {
  return (
    <View style={dividerStyles.row}>
      <View style={dividerStyles.line} />
      <Text style={dividerStyles.text}>or</Text>
      <View style={dividerStyles.line} />
    </View>
  );
}

const dividerStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%' },
  line: { flex: 1, height: 1, backgroundColor: Colors.border },
  text: { fontFamily: 'DMSans-Regular', fontSize: 13, color: Colors.textMuted },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

type LoadingState = null | 'google' | 'apple' | 'email';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState<LoadingState>(null);
  const { signInWithGoogle, signInWithApple } = useAuth();

  const handleGoogle = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading('google');
    try {
      await signInWithGoogle();
      // AuthGate in _layout.tsx handles the redirect to (tabs)
    } catch (e: any) {
      if (e?.message !== 'User cancelled') {
        Alert.alert('Sign in failed', e?.message ?? 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(null);
    }
  };

  const handleApple = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading('apple');
    try {
      await signInWithApple();
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Sign in failed', e?.message ?? 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(null);
    }
  };

  const handleEmail = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/auth/email');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <LinearGradient
        colors={['rgba(123,47,255,0.07)', Colors.bg, 'rgba(255,45,135,0.07)']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        pointerEvents="none"
      />

      {/* Logo */}
      <Animated.View entering={ZoomIn.delay(100).duration(600).springify()} style={styles.logoArea}>
        <LinearGradient
          colors={['#FF2D87', '#A855F7', '#7B2FFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logoBg}
        >
          <Text style={styles.logoText}>V</Text>
        </LinearGradient>
        <Animated.Text entering={FadeInDown.delay(300).duration(500)} style={styles.brandName}>
          viba
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(420).duration(500)} style={styles.tagline}>
          Welcome back
        </Animated.Text>
      </Animated.View>

      {/* Auth buttons */}
      <Animated.View entering={FadeInUp.delay(500).duration(600)} style={styles.authArea}>
        <AuthButton
          variant="outline"
          onPress={handleGoogle}
          loading={loading === 'google'}
        >
          <GoogleLogo size={20} />
          <Text style={styles.authBtnText}>Continue with Google</Text>
        </AuthButton>

        {Platform.OS === 'ios' && (
          <AuthButton
            variant="apple"
            onPress={handleApple}
            loading={loading === 'apple'}
          >
            <Text style={styles.appleLogo}></Text>
            <Text style={styles.appleAuthText}>Continue with Apple</Text>
          </AuthButton>
        )}

        <OrDivider />

        <AuthButton
          variant="gradient"
          onPress={handleEmail}
          loading={loading === 'email'}
        >
          <Text style={styles.gradientBtnText}>Sign in with Email</Text>
        </AuthButton>
      </Animated.View>

      {/* Footer */}
      <Animated.View entering={FadeInUp.delay(700).duration(500)} style={styles.footer}>
        <TouchableOpacity
          onPress={() => router.replace('/onboarding/welcome')}
          activeOpacity={0.7}
          style={styles.newUserBtn}
        >
          <Text style={styles.newUserText}>
            New to Viba?{' '}
            <Text style={styles.newUserCta}>Create account</Text>
          </Text>
        </TouchableOpacity>

        <Text style={styles.legalText}>
          By continuing you agree to our{' '}
          <Text style={styles.legalLink}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={styles.legalLink}>Privacy Policy</Text>
        </Text>

        {__DEV__ && (
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)')}
            activeOpacity={0.7}
            style={styles.devSkipBtn}
          >
            <Text style={styles.devSkipText}>⚡ Dev: skip login</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
  },
  logoArea: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 10,
  },
  logoBg: {
    width: 84,
    height: 84,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: 'Syne-ExtraBold',
    fontSize: 48,
    color: '#FFFFFF',
    marginTop: -4,
  },
  brandName: {
    fontFamily: 'Syne-ExtraBold',
    fontSize: 32,
    color: Colors.textPrimary,
    letterSpacing: 4,
  },
  tagline: {
    fontFamily: 'DMSans-Regular',
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  authArea: {
    width: '100%',
    gap: 12,
  },
  authBtnText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    color: Colors.textPrimary,
  },
  appleLogo: {
    fontSize: 20,
    color: '#000000',
    lineHeight: 22,
  },
  appleAuthText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    color: '#000000',
  },
  gradientBtnText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  footer: {
    alignItems: 'center',
    gap: 16,
    paddingBottom: 12,
  },
  newUserBtn: {
    paddingVertical: 6,
  },
  newUserText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 15,
    color: Colors.textSecondary,
  },
  newUserCta: {
    fontFamily: 'DMSans-Bold',
    color: Colors.pink,
  },
  legalText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  legalLink: {
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },
  devSkipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dashed',
  },
  devSkipText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: Colors.textMuted,
  },
});
