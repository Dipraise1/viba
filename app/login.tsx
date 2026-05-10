import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';

const IS_PAD = Platform.OS === 'ios' && Platform.isPad;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

// ─── Product preview ─────────────────────────────────────────────────────────

function StreamPreview() {
  return (
    <Animated.View entering={FadeInDown.delay(220).duration(600)} style={previewStyles.shell}>
      <LinearGradient
        colors={['rgba(255,255,255,0.18)', 'rgba(255,45,135,0.26)', 'rgba(0,212,170,0.18)']}
        style={previewStyles.frameBorder}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={previewStyles.frame}>
          <LinearGradient
            colors={['#1C1B28', '#22293A', '#071016']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={previewStyles.lightBand} />
          <View style={previewStyles.topRow}>
            <View style={previewStyles.liveBadge}>
              <View style={previewStyles.liveDot} />
              <Text style={previewStyles.liveText}>LIVE</Text>
            </View>
            <View style={previewStyles.viewerPill}>
              <Ionicons name="eye" size={12} color="rgba(255,255,255,0.88)" />
              <Text style={previewStyles.viewerText}>8.4K</Text>
            </View>
          </View>

          <View style={previewStyles.creatorBlock}>
            <View style={previewStyles.creatorAvatar}>
              <Image source={require('../assets/logo.png')} style={previewStyles.creatorLogo} resizeMode="contain" />
            </View>
            <View style={previewStyles.creatorCopy}>
              <Text style={previewStyles.creatorName}>Viba Live</Text>
              <View style={previewStyles.waveRow}>
                <View style={[previewStyles.waveBar, { height: 10, backgroundColor: '#FF2D87' }]} />
                <View style={[previewStyles.waveBar, { height: 18, backgroundColor: '#00D4AA' }]} />
                <View style={[previewStyles.waveBar, { height: 13, backgroundColor: '#FFB800' }]} />
                <View style={[previewStyles.waveBar, { height: 22, backgroundColor: '#7B2FFF' }]} />
                <View style={[previewStyles.waveBar, { height: 15, backgroundColor: '#FF6B35' }]} />
              </View>
            </View>
          </View>

          <View style={previewStyles.platformDock}>
            {[
              { icon: 'tiktok', color: '#010101' },
              { icon: 'instagram', color: '#E1306C' },
              { icon: 'youtube', color: '#FF0000' },
              { icon: 'twitch', color: '#9146FF' },
            ].map((item) => (
              <View key={item.icon} style={[previewStyles.platformIcon, { backgroundColor: item.color }]}>
                <FontAwesome5 name={item.icon as any} size={14} color="#FFFFFF" solid />
              </View>
            ))}
          </View>

          <View style={previewStyles.chatStack}>
            <View style={previewStyles.chatLineWide} />
            <View style={previewStyles.chatLine} />
            <View style={previewStyles.chatLineShort} />
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

type LoadingState = null | 'google' | 'apple' | 'email';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState<LoadingState>(null);
  const { signInWithGoogle, signInWithApple, signInAsDemo } = useAuth();

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

  const handleDemo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    signInAsDemo();
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(0,212,170,0.08)', Colors.bg, 'rgba(255,45,135,0.08)']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        pointerEvents="none"
      />
      <View style={styles.topBand} pointerEvents="none" />
      <View style={styles.bottomBand} pointerEvents="none" />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + (IS_PAD ? 64 : 30), paddingBottom: insets.bottom + 36 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inner}>
          <StreamPreview />

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

            <TouchableOpacity onPress={handleDemo} activeOpacity={0.7} style={styles.demoBtn}>
              <Ionicons name="arrow-forward-circle-outline" size={18} color={Colors.textMuted} />
              <Text style={styles.demoText}>Continue without account</Text>
            </TouchableOpacity>
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
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  topBand: {
    position: 'absolute',
    top: -54,
    right: -80,
    width: SCREEN_WIDTH * 0.82,
    height: 180,
    borderRadius: 34,
    backgroundColor: 'rgba(0,212,170,0.10)',
    transform: [{ rotate: '-16deg' }],
  },
  bottomBand: {
    position: 'absolute',
    bottom: -70,
    left: -86,
    width: SCREEN_WIDTH * 0.9,
    height: 190,
    borderRadius: 34,
    backgroundColor: 'rgba(255,45,135,0.10)',
    transform: [{ rotate: '-14deg' }],
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: IS_PAD ? 'center' : 'flex-start',
  },
  inner: {
    width: IS_PAD ? Math.min(520, SCREEN_WIDTH * 0.6) : '100%',
    paddingHorizontal: IS_PAD ? 0 : 28,
    gap: IS_PAD ? 34 : 24,
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
  demoBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: 'transparent',
  },
  demoText: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 15,
    color: Colors.textMuted,
  },
});

const previewStyles = StyleSheet.create({
  shell: {
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.34,
    shadowRadius: 26,
    elevation: 18,
  },
  frameBorder: {
    borderRadius: 30,
    padding: 1,
  },
  frame: {
    height: IS_PAD ? 260 : 218,
    borderRadius: 29,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    justifyContent: 'space-between',
  },
  lightBand: {
    position: 'absolute',
    top: 22,
    left: -40,
    width: '90%',
    height: 72,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    transform: [{ rotate: '-18deg' }],
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,45,135,0.88)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  liveText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  viewerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.34)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  viewerText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  creatorBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  creatorAvatar: {
    width: 66,
    height: 66,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.24)',
    backgroundColor: 'rgba(0,0,0,0.35)',
    overflow: 'hidden',
  },
  creatorLogo: {
    width: 56,
    height: 40,
  },
  creatorCopy: {
    flex: 1,
    gap: 10,
  },
  creatorName: {
    fontFamily: 'Syne-Bold',
    fontSize: 18,
    color: '#FFFFFF',
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
    height: 26,
  },
  waveBar: {
    width: 7,
    borderRadius: 4,
  },
  platformDock: {
    flexDirection: 'row',
    gap: 8,
  },
  platformIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  chatStack: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 120,
    gap: 7,
    alignItems: 'flex-end',
  },
  chatLineWide: {
    width: 120,
    height: 9,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.34)',
  },
  chatLine: {
    width: 92,
    height: 9,
    borderRadius: 5,
    backgroundColor: 'rgba(0,212,170,0.36)',
  },
  chatLineShort: {
    width: 68,
    height: 9,
    borderRadius: 5,
    backgroundColor: 'rgba(255,184,0,0.36)',
  },
});
