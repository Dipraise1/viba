import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  ZoomIn,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import GradientButton from '@/components/GradientButton';

type Stage = 'idle' | 'loading' | 'success';

const GMAIL_RED = '#EA4335';
const GMAIL_BLUE = '#4285F4';

function GoogleIcon({ size = 24 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="mail" size={size * 0.85} color="#FFFFFF" />
    </View>
  );
}

export default function GmailScreen() {
  const [stage, setStage] = useState<Stage>('idle');
  const [email, setEmail] = useState<string | null>(null);

  const handleConnect = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStage('loading');
    // Simulate Google OAuth
    setTimeout(() => {
      setEmail('you@gmail.com');
      setStage('success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 2000);
  };

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/onboarding/notifications');
  };

  return (
    <View style={styles.container}>
      {/* Nav */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.topNav}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.stepPill}>
          <Text style={styles.stepText}>4 of 6</Text>
        </View>
      </Animated.View>

      <View style={styles.content}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.header}>
          <Text style={styles.title}>Connect Gmail{'\n'}to finish up</Text>
          <Text style={styles.subtitle}>
            Your Gmail creates your Viba account and keeps everything tied together.
          </Text>
        </Animated.View>

        {/* Google card */}
        <Animated.View entering={FadeInDown.delay(300).duration(600)} style={styles.card}>
          <LinearGradient
            colors={['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.01)']}
            style={StyleSheet.absoluteFill}
          />

          {/* Google logo area */}
          <View style={styles.googleIconRow}>
            <View style={styles.googleIconBg}>
              <Ionicons name="mail" size={28} color={GMAIL_RED} />
            </View>
            <View style={styles.googleInfo}>
              <Text style={styles.googleTitle}>Google / Gmail</Text>
              <Text style={styles.googleSub}>
                {stage === 'success' && email ? email : 'Sign in with your Google account'}
              </Text>
            </View>
            {stage === 'success' && (
              <Animated.View entering={ZoomIn.duration(400).springify()}>
                <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
              </Animated.View>
            )}
          </View>

          {/* Permissions */}
          <View style={styles.permList}>
            {[
              'Create and secure your Viba account',
              'Send stream notifications to your inbox',
              'Recover your account if needed',
            ].map((perm) => (
              <View key={perm} style={styles.permRow}>
                <View style={[styles.permDot, { backgroundColor: GMAIL_BLUE }]}>
                  <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                </View>
                <Text style={styles.permText}>{perm}</Text>
              </View>
            ))}
          </View>

          {/* Action */}
          {stage === 'idle' && (
            <TouchableOpacity style={styles.googleBtn} onPress={handleConnect} activeOpacity={0.85}>
              <View style={styles.googleBtnInner}>
                <Ionicons name="logo-google" size={18} color={GMAIL_RED} />
                <Text style={styles.googleBtnText}>Continue with Google</Text>
              </View>
            </TouchableOpacity>
          )}

          {stage === 'loading' && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={GMAIL_RED} size="small" />
              <Text style={styles.loadingText}>Redirecting to Google…</Text>
            </View>
          )}

          {stage === 'success' && (
            <Animated.View entering={FadeInDown.duration(400)} style={styles.successRow}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              <Text style={styles.successText}>Gmail connected successfully</Text>
            </Animated.View>
          )}
        </Animated.View>

        {/* Privacy note */}
        <Animated.Text entering={FadeInDown.delay(500).duration(600)} style={styles.privacyNote}>
          We never post to Gmail or share your email with third parties.
        </Animated.Text>
      </View>

      {/* Footer */}
      <Animated.View entering={FadeInUp.delay(600).duration(500)} style={styles.footer}>
        <GradientButton
          label="Continue"
          onPress={handleContinue}
          disabled={stage !== 'success'}
          size="large"
        />
        {stage !== 'success' && (
          <Text style={styles.hintText}>Connect Gmail to continue</Text>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgDeep },
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
  stepText: { fontFamily: 'DMSans-Medium', fontSize: 13, color: Colors.textMuted },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  header: { marginBottom: 32 },
  title: {
    fontFamily: 'Syne-ExtraBold',
    fontSize: 36,
    color: Colors.textPrimary,
    lineHeight: 44,
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: 'DMSans-Regular',
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 23,
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    gap: 16,
    overflow: 'hidden',
  },
  googleIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  googleIconBg: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(234,67,53,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(234,67,53,0.2)',
  },
  googleInfo: { flex: 1 },
  googleTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 15,
    color: Colors.textPrimary,
  },
  googleSub: {
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  permList: {
    gap: 10,
    backgroundColor: Colors.bgDeep,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  permDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  googleBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  googleBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  googleBtnText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 15,
    color: '#1F1F1F',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  loadingText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: Colors.textMuted,
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,217,126,0.07)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.success + '30',
  },
  successText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: Colors.success,
  },
  privacyNote: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    paddingTop: 16,
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.bgDeep,
  },
  hintText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
