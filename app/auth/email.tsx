import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { supabase } from '@/lib/supabase';

type Mode = 'signin' | 'signup';

export default function EmailAuthScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const isSignUp = mode === 'signup';

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    if (isSignUp && !name.trim()) {
      Alert.alert('Missing name', 'Please enter your display name.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: name.trim() },
          },
        });
        if (error) throw error;
        Alert.alert(
          'Check your email',
          `We sent a confirmation link to ${email.trim()}. Click it to activate your account.`,
          [{ text: 'OK', onPress: () => setMode('signin') }]
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        // AuthGate handles redirect
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Enter your email', 'Type your email above first.');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Password reset sent', `Check ${email.trim()} for a reset link.`);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        </Animated.View>

        {/* Title */}
        <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.titleArea}>
          <Text style={styles.title}>{isSignUp ? 'Create account' : 'Sign in'}</Text>
          <Text style={styles.sub}>
            {isSignUp
              ? 'Start streaming to every platform at once.'
              : 'Welcome back to Viba.'}
          </Text>
        </Animated.View>

        {/* Form */}
        <Animated.View entering={FadeInDown.delay(160).duration(400)} style={styles.form}>
          {isSignUp && (
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Display name</Text>
              <View style={styles.inputRow}>
                <Ionicons name="person-outline" size={16} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>
            </View>
          )}

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={16} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={16} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder={isSignUp ? 'At least 6 characters' : '••••••••'}
                placeholderTextColor={Colors.textMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
              <TouchableOpacity onPress={() => setShowPassword((s) => !s)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={16}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {!isSignUp && (
            <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7} style={styles.forgotBtn}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Submit */}
        <Animated.View entering={FadeInUp.delay(240).duration(400)} style={styles.submitArea}>
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            activeOpacity={0.85}
            disabled={loading}
          >
            <LinearGradient
              colors={['#FF2D87', '#7B2FFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitGrad}
            >
              {loading
                ? <ActivityIndicator color="#FFFFFF" size="small" />
                : <Text style={styles.submitText}>{isSignUp ? 'Create account' : 'Sign in'}</Text>
              }
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleText}>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </Text>
            <TouchableOpacity
              onPress={() => { setMode(isSignUp ? 'signin' : 'signup'); Haptics.selectionAsync(); }}
              activeOpacity={0.7}
            >
              <Text style={styles.toggleCta}>{isSignUp ? 'Sign in' : 'Sign up'}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    gap: 28,
  },
  header: { flexDirection: 'row' },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleArea: { gap: 6 },
  title: {
    fontFamily: 'Syne-ExtraBold',
    fontSize: 30,
    color: Colors.textPrimary,
  },
  sub: {
    fontFamily: 'DMSans-Regular',
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  form: { gap: 16 },
  fieldWrap: { gap: 8 },
  label: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  input: {
    flex: 1,
    fontFamily: 'DMSans-Regular',
    fontSize: 15,
    color: Colors.textPrimary,
  },
  forgotBtn: { alignSelf: 'flex-end' },
  forgotText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: Colors.pink,
  },
  submitArea: { gap: 20 },
  submitBtn: { borderRadius: 16, overflow: 'hidden' },
  submitGrad: {
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  submitText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  toggleText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  toggleCta: {
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
    color: Colors.pink,
  },
});
