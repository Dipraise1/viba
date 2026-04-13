import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useApp, Quality, Orientation, Camera, CommentVisibility } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';

// ─── Reusable row components ───────────────────────────────────────────────

function SectionHeader({ title, delay = 0 }: { title: string; delay?: number }) {
  return (
    <Animated.Text entering={FadeInDown.delay(delay).duration(400)} style={styles.sectionHeader}>
      {title}
    </Animated.Text>
  );
}

function SettingToggle({
  icon,
  label,
  sub,
  value,
  onChange,
}: {
  icon: string;
  label: string;
  sub?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon as any} size={16} color={Colors.textSecondary} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={(v) => { Haptics.selectionAsync(); onChange(v); }}
        trackColor={{ false: Colors.bgGlass, true: Colors.pink }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={Colors.bgGlass}
      />
    </View>
  );
}

function SettingLink({
  icon,
  label,
  sub,
  value,
  onPress,
  danger,
}: {
  icon: string;
  label: string;
  sub?: string;
  value?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        <Ionicons
          name={icon as any}
          size={16}
          color={danger ? '#FF4444' : Colors.textSecondary}
        />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
        {sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      {value && <Text style={styles.rowValue}>{value}</Text>}
      {!danger && (
        <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} style={{ marginLeft: 4 }} />
      )}
    </TouchableOpacity>
  );
}

function SegmentControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <View style={styles.segmentRow}>
      <Text style={styles.segmentLabel}>{label}</Text>
      <View style={styles.segmentGroup}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.id}
            style={[styles.segmentOption, value === opt.id && styles.segmentOptionActive]}
            onPress={() => { Haptics.selectionAsync(); onChange(opt.id); }}
            activeOpacity={0.7}
          >
            <Text style={[styles.segmentText, value === opt.id && styles.segmentTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function GroupCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.groupCard}>{children}</View>;
}

// ─── Main screen ──────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { streamSettings, notifications, privacy, updateStreamSettings, updateNotifications, updatePrivacy } = useApp();
  const { signOut } = useAuth();

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your Viba account and disconnect all linked platforms. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Request submitted', 'Your data deletion request has been sent. Your account will be removed within 30 days.');
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Sign out of Viba?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          // AuthGate in _layout.tsx handles the redirect to login
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 4, paddingBottom: 48 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Back header */}
      <Animated.View entering={FadeInDown.delay(0).duration(400)} style={styles.navHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      {/* ── Notifications ── */}
      <SectionHeader title="Notifications" delay={60} />
      <Animated.View entering={FadeInDown.delay(80).duration(400)}>
        <GroupCard>
          <SettingToggle
            icon="chatbubble-outline"
            label="New comments"
            sub="Get notified when viewers comment"
            value={notifications.comments}
            onChange={(v) => updateNotifications({ comments: v })}
          />
          <Divider />
          <SettingToggle
            icon="gift-outline"
            label="Gifts received"
            sub="Roses, Stars, Bits and more"
            value={notifications.gifts}
            onChange={(v) => updateNotifications({ gifts: v })}
          />
          <Divider />
          <SettingToggle
            icon="person-add-outline"
            label="New followers"
            value={notifications.followers}
            onChange={(v) => updateNotifications({ followers: v })}
          />
          <Divider />
          <SettingToggle
            icon="trending-up-outline"
            label="Viewer milestones"
            sub="100, 500, 1K+ viewers"
            value={notifications.viewerMilestones}
            onChange={(v) => updateNotifications({ viewerMilestones: v })}
          />
        </GroupCard>
      </Animated.View>

      {/* ── Stream Settings ── */}
      <SectionHeader title="Stream" delay={160} />
      <Animated.View entering={FadeInDown.delay(180).duration(400)}>
        <GroupCard>
          <SegmentControl<Quality>
            label="Video quality"
            options={[
              { id: '720p', label: '720p' },
              { id: '1080p', label: '1080p' },
              { id: '4K', label: '4K' },
            ]}
            value={streamSettings.quality}
            onChange={(v) => updateStreamSettings({ quality: v })}
          />
          <Divider />
          <SegmentControl<Orientation>
            label="Orientation"
            options={[
              { id: 'portrait', label: 'Portrait' },
              { id: 'landscape', label: 'Landscape' },
            ]}
            value={streamSettings.orientation}
            onChange={(v) => updateStreamSettings({ orientation: v })}
          />
          <Divider />
          <SegmentControl<Camera>
            label="Default camera"
            options={[
              { id: 'front', label: 'Front' },
              { id: 'back', label: 'Back' },
            ]}
            value={streamSettings.camera}
            onChange={(v) => updateStreamSettings({ camera: v })}
          />
          <Divider />
          <SettingToggle
            icon="mic-outline"
            label="Microphone"
            sub="Enable mic on stream start"
            value={streamSettings.micEnabled}
            onChange={(v) => updateStreamSettings({ micEnabled: v })}
          />
          <Divider />
          <SettingToggle
            icon="save-outline"
            label="Auto-record streams"
            sub="Save all streams to your library"
            value={streamSettings.autoRecord}
            onChange={(v) => updateStreamSettings({ autoRecord: v })}
          />
        </GroupCard>
      </Animated.View>

      {/* ── Privacy ── */}
      <SectionHeader title="Privacy" delay={300} />
      <Animated.View entering={FadeInDown.delay(320).duration(400)}>
        <GroupCard>
          <SegmentControl<CommentVisibility>
            label="Who can comment"
            options={[
              { id: 'everyone', label: 'Everyone' },
              { id: 'followers', label: 'Followers' },
              { id: 'none', label: 'No one' },
            ]}
            value={privacy.commentVisibility}
            onChange={(v) => updatePrivacy({ commentVisibility: v })}
          />
          <Divider />
          <SettingToggle
            icon="gift-outline"
            label="Show gifts publicly"
            sub="Gifts appear in your comment feed"
            value={privacy.showGiftsPublicly}
            onChange={(v) => updatePrivacy({ showGiftsPublicly: v })}
          />
          <Divider />
          <SettingToggle
            icon="eye-outline"
            label="Show viewer count"
            sub="Visible to all platforms"
            value={privacy.showViewerCount}
            onChange={(v) => updatePrivacy({ showViewerCount: v })}
          />
        </GroupCard>
      </Animated.View>

      {/* ── Appearance ── */}
      <SectionHeader title="Appearance" delay={420} />
      <Animated.View entering={FadeInDown.delay(440).duration(400)}>
        <GroupCard>
          <SettingLink
            icon="moon-outline"
            label="Theme"
            value="Dark"
            onPress={() => {}}
          />
          <Divider />
          <SettingLink
            icon="text-outline"
            label="Comment text size"
            value="Medium"
            onPress={() => {}}
          />
        </GroupCard>
      </Animated.View>

      {/* ── Support ── */}
      <SectionHeader title="Support" delay={520} />
      <Animated.View entering={FadeInDown.delay(540).duration(400)}>
        <GroupCard>
          <SettingLink
            icon="help-circle-outline"
            label="Help Center"
            sub="FAQs, guides, contact"
            onPress={() => {}}
          />
          <Divider />
          <SettingLink
            icon="bug-outline"
            label="Report a bug"
            onPress={() => {}}
          />
          <Divider />
          <SettingLink
            icon="star-outline"
            label="Rate Viba"
            onPress={() => {}}
          />
          <Divider />
          <SettingLink
            icon="share-social-outline"
            label="Share with friends"
            onPress={() => {}}
          />
        </GroupCard>
      </Animated.View>

      {/* ── Legal ── */}
      <SectionHeader title="Legal" delay={620} />
      <Animated.View entering={FadeInDown.delay(640).duration(400)}>
        <GroupCard>
          <SettingLink
            icon="shield-checkmark-outline"
            label="Privacy Policy"
            onPress={() => {}}
          />
          <Divider />
          <SettingLink
            icon="document-text-outline"
            label="Terms of Service"
            onPress={() => {}}
          />
          <Divider />
          <SettingLink
            icon="code-slash-outline"
            label="Open Source Licenses"
            onPress={() => {}}
          />
        </GroupCard>
      </Animated.View>

      {/* ── Danger zone ── */}
      <SectionHeader title="Account" delay={720} />
      <Animated.View entering={FadeInDown.delay(740).duration(400)}>
        <GroupCard>
          <SettingLink
            icon="log-out-outline"
            label="Sign Out"
            onPress={handleSignOut}
          />
          <Divider />
          <SettingLink
            icon="trash-outline"
            label="Delete Account"
            sub="Permanently remove all your data"
            onPress={handleDeleteAccount}
            danger
          />
        </GroupCard>
      </Animated.View>

      {/* Version */}
      <Animated.View entering={FadeInDown.delay(800).duration(400)} style={styles.versionBlock}>
        <Text style={styles.versionText}>Viba · Version 1.0.0</Text>
        <Text style={styles.versionSub}>Made for creators, by creators.</Text>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    paddingHorizontal: 20,
    gap: 6,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 4,
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
  sectionHeader: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 20,
    marginBottom: 6,
    paddingLeft: 4,
  },
  groupCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 52,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 12,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: Colors.bgGlass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconDanger: {
    backgroundColor: 'rgba(255,68,68,0.12)',
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  rowLabel: {
    fontFamily: 'DMSans-Regular',
    fontSize: 15,
    color: Colors.textPrimary,
  },
  rowLabelDanger: {
    color: '#FF4444',
  },
  rowSub: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: Colors.textMuted,
  },
  rowValue: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: Colors.textMuted,
  },
  segmentRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  segmentLabel: {
    fontFamily: 'DMSans-Regular',
    fontSize: 15,
    color: Colors.textPrimary,
  },
  segmentGroup: {
    flexDirection: 'row',
    backgroundColor: Colors.bgGlass,
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  segmentOption: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentOptionActive: {
    backgroundColor: Colors.pink,
  },
  segmentText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: Colors.textMuted,
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  versionBlock: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 8,
    gap: 4,
  },
  versionText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: Colors.textMuted,
  },
  versionSub: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: Colors.textMuted,
    opacity: 0.6,
  },
});
