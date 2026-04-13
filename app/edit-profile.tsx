import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useApp } from '@/context/AppContext';

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  maxLength,
  delay = 0,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  delay?: number;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.fieldInput, focused && styles.fieldInputFocused]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          style={styles.input}
          maxLength={maxLength}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {maxLength && (
          <Text style={styles.charCount}>{value.length}/{maxLength}</Text>
        )}
      </View>
    </Animated.View>
  );
}

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useApp();

  const [displayName, setDisplayName] = useState(profile.displayName);
  const [handle, setHandle] = useState(profile.handle.replace('@', ''));
  const [bio, setBio] = useState('Multi-platform live streamer');

  const handleSave = () => {
    if (!displayName.trim()) {
      Alert.alert('Name required', 'Please enter a display name.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateProfile({
      displayName: displayName.trim(),
      handle: `@${handle.trim().toLowerCase().replace(/\s/g, '_')}`,
    });
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 4, paddingBottom: 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(0).duration(400)} style={styles.navHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Edit Profile</Text>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Avatar */}
        <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            <LinearGradient
              colors={['#FF2D87', '#7B2FFF']}
              style={styles.avatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.avatarInitial}>
                {displayName.charAt(0).toUpperCase() || 'C'}
              </Text>
            </LinearGradient>
            <View style={styles.avatarEditBadge}>
              <Ionicons name="camera" size={12} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.avatarHint}>Tap to change photo</Text>
        </Animated.View>

        {/* Fields */}
        <View style={styles.fields}>
          <InputField
            label="Display name"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            maxLength={32}
            delay={160}
          />
          <InputField
            label="Username"
            value={handle}
            onChangeText={setHandle}
            placeholder="your_handle"
            maxLength={24}
            delay={220}
          />
          <InputField
            label="Bio"
            value={bio}
            onChangeText={setBio}
            placeholder="Tell your audience about yourself"
            maxLength={120}
            delay={280}
          />
        </View>

        {/* Hint */}
        <Animated.Text entering={FadeInDown.delay(360).duration(400)} style={styles.hint}>
          Your username appears on all platform replies and your public Viba profile.
        </Animated.Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    paddingHorizontal: 20,
    gap: 16,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
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
  screenTitle: {
    fontFamily: 'Syne-Bold',
    fontSize: 18,
    color: Colors.textPrimary,
  },
  saveBtn: {
    backgroundColor: Colors.pink,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 12,
  },
  saveBtnText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  avatarSection: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: 'Syne-ExtraBold',
    fontSize: 36,
    color: '#FFFFFF',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: Colors.pink,
    borderWidth: 2,
    borderColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHint: {
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    color: Colors.textMuted,
  },
  fields: {
    gap: 12,
  },
  fieldWrap: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: Colors.textSecondary,
    paddingLeft: 2,
  },
  fieldInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 8,
  },
  fieldInputFocused: {
    borderColor: Colors.pink,
    backgroundColor: Colors.pinkDim,
  },
  input: {
    flex: 1,
    fontFamily: 'DMSans-Regular',
    fontSize: 15,
    color: Colors.textPrimary,
  },
  charCount: {
    fontFamily: 'DMSans-Regular',
    fontSize: 11,
    color: Colors.textMuted,
  },
  hint: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
});
