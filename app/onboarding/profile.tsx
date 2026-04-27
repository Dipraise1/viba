import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';

const USERNAME_REGEX = /^[a-z0-9_]{3,24}$/;

type CheckState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export default function ProfileSetupScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { updateProfile } = useApp();

  // Pre-fill name from OAuth
  const [displayName, setDisplayName] = useState(
    user?.user_metadata?.full_name ?? ''
  );
  const [username, setUsername] = useState('');
  const [checkState, setCheckState] = useState<CheckState>('idle');
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const avatarUrl: string | null = user?.user_metadata?.avatar_url ?? null;

  // Auto-suggest username from display name
  useEffect(() => {
    if (!username && displayName) {
      const suggested = displayName
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
        .slice(0, 24);
      setUsername(suggested);
    }
  }, []);

  const handleUsernameChange = (text: string) => {
    const clean = text.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24);
    setUsername(clean);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!clean) { setCheckState('idle'); return; }
    if (!USERNAME_REGEX.test(clean)) { setCheckState('invalid'); return; }

    setCheckState('checking');
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', clean)
        .neq('id', user?.id ?? '')
        .maybeSingle();
      setCheckState(data ? 'taken' : 'available');
    }, 500);
  };

  const canContinue =
    displayName.trim().length >= 2 &&
    checkState === 'available' &&
    !saving;

  const handleContinue = async () => {
    if (!canContinue) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
      await updateProfile({
        displayName: displayName.trim(),
        handle: `@${username}`,
      });
      router.replace('/onboarding/notifications');
    } catch {
      setSaving(false);
    }
  };

  const checkIcon = () => {
    if (checkState === 'checking') return <ActivityIndicator size="small" color={Colors.textMuted} />;
    if (checkState === 'available') return <Ionicons name="checkmark-circle" size={18} color="#00D97E" />;
    if (checkState === 'taken') return <Ionicons name="close-circle" size={18} color="#FF4444" />;
    if (checkState === 'invalid') return <Ionicons name="alert-circle" size={18} color="#FFB800" />;
    return null;
  };

  const checkHint = () => {
    if (checkState === 'available') return { text: 'Username is available', color: '#00D97E' };
    if (checkState === 'taken') return { text: 'Already taken — try another', color: '#FF4444' };
    if (checkState === 'invalid') return { text: 'Letters, numbers and _ only (3–24 chars)', color: '#FFB800' };
    return null;
  };

  const hint = checkHint();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['rgba(123,47,255,0.08)', Colors.bg, 'rgba(255,45,135,0.06)']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(0).duration(500)} style={styles.header}>
          <Text style={styles.title}>Set up your profile</Text>
          <Text style={styles.subtitle}>
            This is how other creators and your audience will find you.
          </Text>
        </Animated.View>

        {/* Avatar */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.avatarSection}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <LinearGradient
              colors={['#FF2D87', '#7B2FFF']}
              style={styles.avatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.avatarInitial}>
                {displayName.charAt(0).toUpperCase() || '?'}
              </Text>
            </LinearGradient>
          )}
        </Animated.View>

        {/* Fields */}
        <View style={styles.fields}>
          {/* Display name */}
          <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.fieldGroup}>
            <Text style={styles.label}>Display name</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your name"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="words"
                maxLength={32}
              />
            </View>
          </Animated.View>

          {/* Username */}
          <Animated.View entering={FadeInDown.delay(280).duration(500)} style={styles.fieldGroup}>
            <Text style={styles.label}>Username</Text>
            <View style={[
              styles.inputWrap,
              checkState === 'available' && styles.inputWrapGreen,
              checkState === 'taken' && styles.inputWrapRed,
            ]}>
              <Text style={styles.atSign}>@</Text>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={username}
                onChangeText={handleUsernameChange}
                placeholder="your_username"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={24}
              />
              <View style={styles.checkIcon}>{checkIcon()}</View>
            </View>
            {hint && (
              <Animated.Text
                entering={FadeInDown.duration(200)}
                style={[styles.hint, { color: hint.color }]}
              >
                {hint.text}
              </Animated.Text>
            )}
          </Animated.View>
        </View>

        {/* Continue */}
        <Animated.View entering={FadeInUp.delay(400).duration(500)} style={styles.footer}>
          <TouchableOpacity
            style={[styles.continueBtn, !canContinue && styles.continueBtnDisabled]}
            onPress={handleContinue}
            activeOpacity={0.85}
            disabled={!canContinue}
          >
            <LinearGradient
              colors={canContinue ? ['#FF2D87', '#7B2FFF'] : [Colors.bgCard, Colors.bgCard]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueBtnInner}
            >
              {saving
                ? <ActivityIndicator color="#FFFFFF" size="small" />
                : <Text style={[styles.continueBtnText, !canContinue && { color: Colors.textMuted }]}>
                    Continue
                  </Text>
              }
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.legalHint}>
            You can change your username later in Settings.
          </Text>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 28,
    gap: 28,
  },
  header: {
    gap: 8,
  },
  title: {
    fontFamily: 'Syne-ExtraBold',
    fontSize: 30,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: 'DMSans-Regular',
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  avatarSection: {
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarInitial: {
    fontFamily: 'Syne-ExtraBold',
    fontSize: 32,
    color: '#FFFFFF',
  },
  fields: {
    flex: 1,
    gap: 20,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: Colors.textSecondary,
    paddingLeft: 2,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 6,
  },
  inputWrapGreen: {
    borderColor: '#00D97E',
    backgroundColor: 'rgba(0,217,126,0.06)',
  },
  inputWrapRed: {
    borderColor: '#FF4444',
    backgroundColor: 'rgba(255,68,68,0.06)',
  },
  atSign: {
    fontFamily: 'DMSans-Bold',
    fontSize: 16,
    color: Colors.textMuted,
  },
  input: {
    fontFamily: 'DMSans-Regular',
    fontSize: 16,
    color: Colors.textPrimary,
  },
  checkIcon: {
    width: 22,
    alignItems: 'center',
  },
  hint: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    paddingLeft: 2,
  },
  footer: {
    gap: 14,
    alignItems: 'center',
  },
  continueBtn: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  continueBtnDisabled: {
    opacity: 0.6,
  },
  continueBtnInner: {
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  continueBtnText: {
    fontFamily: 'Syne-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  legalHint: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
