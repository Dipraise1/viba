import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { useApp, Quality, Orientation, Camera, CommentVisibility } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { connectRestream } from '@/lib/restream';
import type { ThemeMode } from '@/constants/themes';

// ─── Permission helpers ────────────────────────────────────────────────────────

async function getNotifPermission(): Promise<'granted' | 'denied' | 'undetermined'> {
  const { status } = await Notifications.getPermissionsAsync();
  return status as 'granted' | 'denied' | 'undetermined';
}

async function requestNotifPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ─── Reusable row components ───────────────────────────────────────────────────

function SectionHeader({ title, delay = 0, C }: { title: string; delay?: number; C: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <Animated.Text entering={FadeInDown.delay(delay).duration(400)} style={[s.sectionHeader, { color: C.textMuted }]}>
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
  C,
}: {
  icon: string;
  label: string;
  sub?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  C: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={[s.row, { borderColor: C.border }]}>
      <View style={[s.rowIcon, { backgroundColor: C.bgGlass }]}>
        <Ionicons name={icon as any} size={16} color={C.textSecondary} />
      </View>
      <View style={s.rowText}>
        <Text style={[s.rowLabel, { color: C.textPrimary }]}>{label}</Text>
        {sub && <Text style={[s.rowSub, { color: C.textMuted }]}>{sub}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={(v) => { Haptics.selectionAsync(); onChange(v); }}
        trackColor={{ false: C.bgGlass, true: C.pink }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={C.bgGlass}
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
  C,
}: {
  icon: string;
  label: string;
  sub?: string;
  value?: string;
  onPress: () => void;
  danger?: boolean;
  C: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[s.rowIcon, danger ? s.rowIconDanger : { backgroundColor: C.bgGlass }]}>
        <Ionicons name={icon as any} size={16} color={danger ? '#FF4444' : C.textSecondary} />
      </View>
      <View style={s.rowText}>
        <Text style={[s.rowLabel, danger && s.rowLabelDanger, !danger && { color: C.textPrimary }]}>{label}</Text>
        {sub && <Text style={[s.rowSub, { color: C.textMuted }]}>{sub}</Text>}
      </View>
      {value && <Text style={[s.rowValue, { color: C.textMuted }]}>{value}</Text>}
      {!danger && <Ionicons name="chevron-forward" size={14} color={C.textMuted} style={{ marginLeft: 4 }} />}
    </TouchableOpacity>
  );
}

function SegmentControl<T extends string>({
  options,
  value,
  onChange,
  label,
  C,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  C: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={s.segmentRow}>
      <Text style={[s.segmentLabel, { color: C.textPrimary }]}>{label}</Text>
      <View style={[s.segmentGroup, { backgroundColor: C.bgGlass }]}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.id}
            style={[s.segmentOption, value === opt.id && { backgroundColor: C.pink }]}
            onPress={() => { Haptics.selectionAsync(); onChange(opt.id); }}
            activeOpacity={0.7}
          >
            <Text style={[s.segmentText, { color: value === opt.id ? '#FFFFFF' : C.textMuted }]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function Divider({ C }: { C: ReturnType<typeof useTheme>['colors'] }) {
  return <View style={[s.divider, { backgroundColor: C.border }]} />;
}

function GroupCard({ children, C }: { children: React.ReactNode; C: ReturnType<typeof useTheme>['colors'] }) {
  return <View style={[s.groupCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>{children}</View>;
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { streamSettings, notifications, privacy, updateStreamSettings, updateNotifications, updatePrivacy, restreamKey, restreamToken, setRestreamKey, setRestreamToken } = useApp();
  const { signOut } = useAuth();
  const { theme, setTheme, colors: C, resolvedTheme } = useTheme();

  const [notifPermission, setNotifPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [restreamKeyInput, setRestreamKeyInput] = useState(restreamKey);
  const [savingKey, setSavingKey] = useState(false);
  const [connectingRestream, setConnectingRestream] = useState(false);

  useEffect(() => {
    getNotifPermission().then(setNotifPermission);
  }, []);

  // When any notification toggle is turned on, ensure we have permission first
  const handleNotifToggle = async (key: keyof typeof notifications, value: boolean) => {
    if (value && notifPermission !== 'granted') {
      const granted = await requestNotifPermission();
      setNotifPermission(granted ? 'granted' : 'denied');
      if (!granted) {
        Alert.alert(
          'Notifications blocked',
          'To receive alerts, enable notifications for Viba in your device Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return; // Don't save the toggle if permission denied
      }
    }
    updateNotifications({ [key]: value });
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your Viba account and disconnect all linked platforms. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => Alert.alert('Request submitted', 'Your data deletion request has been sent. Your account will be removed within 30 days.'),
        },
      ]
    );
  };

  const handleSaveRestreamKey = async () => {
    if (!restreamKeyInput.trim()) return;
    setSavingKey(true);
    await setRestreamKey(restreamKeyInput.trim());
    setSavingKey(false);
    Alert.alert('Saved', 'Your Restream stream key has been saved.');
  };

  const handleConnectRestream = async () => {
    setConnectingRestream(true);
    try {
      const token = await connectRestream();
      await setRestreamToken(token);
      Alert.alert('Connected!', 'Restream account connected. You\'ll get real chat and viewer counts while live.');
    } catch (e: any) {
      if (e?.message !== 'Restream connection cancelled') {
        Alert.alert('Connection failed', e?.message ?? 'Could not connect to Restream.');
      }
    } finally {
      setConnectingRestream(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Sign out of Viba?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await signOut(); } },
    ]);
  };

  const themeOptions: { id: ThemeMode; label: string }[] = [
    { id: 'dark', label: 'Dark' },
    { id: 'light', label: 'Light' },
    { id: 'system', label: 'Auto' },
  ];

  return (
    <ScrollView
      style={[s.container, { backgroundColor: C.bg }]}
      contentContainerStyle={[s.content, { paddingTop: insets.top + 4, paddingBottom: 48 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Back header */}
      <Animated.View entering={FadeInDown.delay(0).duration(400)} style={s.navHeader}>
        <TouchableOpacity style={[s.backBtn, { backgroundColor: C.bgCard, borderColor: C.border }]} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.screenTitle, { color: C.textPrimary }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      {/* ── Appearance ── */}
      <SectionHeader title="Appearance" delay={40} C={C} />
      <Animated.View entering={FadeInDown.delay(60).duration(400)}>
        <GroupCard C={C}>
          <View style={s.segmentRow}>
            <View style={s.themeIconRow}>
              <Ionicons
                name={resolvedTheme === 'light' ? 'sunny-outline' : 'moon-outline'}
                size={16}
                color={C.textSecondary}
              />
              <Text style={[s.segmentLabel, { color: C.textPrimary }]}>Theme</Text>
            </View>
            <View style={[s.segmentGroup, { backgroundColor: C.bgGlass }]}>
              {themeOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[s.segmentOption, theme === opt.id && { backgroundColor: C.pink }]}
                  onPress={() => { Haptics.selectionAsync(); setTheme(opt.id); }}
                  activeOpacity={0.7}
                >
                  <Text style={[s.segmentText, { color: theme === opt.id ? '#FFFFFF' : C.textMuted }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Divider C={C} />
          <SettingLink
            icon="text-outline"
            label="Comment text size"
            value="Medium"
            onPress={() => {}}
            C={C}
          />
        </GroupCard>
      </Animated.View>

      {/* ── Notifications ── */}
      <SectionHeader title="Notifications" delay={120} C={C} />

      {/* Permission banner */}
      {notifPermission === 'denied' && (
        <Animated.View entering={FadeInDown.delay(130).duration(400)}>
          <TouchableOpacity
            style={[s.permBanner, { backgroundColor: 'rgba(255,184,0,0.12)', borderColor: 'rgba(255,184,0,0.30)' }]}
            onPress={() => Linking.openSettings()}
            activeOpacity={0.8}
          >
            <Ionicons name="warning-outline" size={16} color={C.gold} />
            <Text style={[s.permBannerText, { color: C.gold }]}>Notifications are blocked — tap to open Settings</Text>
            <Ionicons name="chevron-forward" size={13} color={C.gold} />
          </TouchableOpacity>
        </Animated.View>
      )}

      <Animated.View entering={FadeInDown.delay(140).duration(400)}>
        <GroupCard C={C}>
          <SettingToggle
            icon="chatbubble-outline"
            label="New comments"
            sub="Get notified when viewers comment"
            value={notifications.comments}
            onChange={(v) => handleNotifToggle('comments', v)}
            C={C}
          />
          <Divider C={C} />
          <SettingToggle
            icon="gift-outline"
            label="Gifts received"
            sub="Roses, Stars, Bits and more"
            value={notifications.gifts}
            onChange={(v) => handleNotifToggle('gifts', v)}
            C={C}
          />
          <Divider C={C} />
          <SettingToggle
            icon="person-add-outline"
            label="New followers"
            value={notifications.followers}
            onChange={(v) => handleNotifToggle('followers', v)}
            C={C}
          />
          <Divider C={C} />
          <SettingToggle
            icon="trending-up-outline"
            label="Viewer milestones"
            sub="100, 500, 1K+ viewers"
            value={notifications.viewerMilestones}
            onChange={(v) => handleNotifToggle('viewerMilestones', v)}
            C={C}
          />
        </GroupCard>
      </Animated.View>

      {/* ── Stream Settings ── */}
      <SectionHeader title="Stream" delay={240} C={C} />
      <Animated.View entering={FadeInDown.delay(260).duration(400)}>
        <GroupCard C={C}>
          <SegmentControl<Quality>
            label="Video quality"
            options={[
              { id: '720p', label: '720p' },
              { id: '1080p', label: '1080p' },
              { id: '4K', label: '4K' },
            ]}
            value={streamSettings.quality}
            onChange={(v) => updateStreamSettings({ quality: v })}
            C={C}
          />
          <Divider C={C} />
          <SegmentControl<Orientation>
            label="Orientation"
            options={[
              { id: 'portrait', label: 'Portrait' },
              { id: 'landscape', label: 'Landscape' },
            ]}
            value={streamSettings.orientation}
            onChange={(v) => updateStreamSettings({ orientation: v })}
            C={C}
          />
          <Divider C={C} />
          <SegmentControl<Camera>
            label="Default camera"
            options={[
              { id: 'front', label: 'Front' },
              { id: 'back', label: 'Back' },
            ]}
            value={streamSettings.camera}
            onChange={(v) => updateStreamSettings({ camera: v })}
            C={C}
          />
          <Divider C={C} />
          <SettingToggle
            icon="mic-outline"
            label="Microphone"
            sub="Enable mic on stream start"
            value={streamSettings.micEnabled}
            onChange={(v) => updateStreamSettings({ micEnabled: v })}
            C={C}
          />
          <Divider C={C} />
          <SettingToggle
            icon="save-outline"
            label="Auto-record streams"
            sub="Save all streams to your library"
            value={streamSettings.autoRecord}
            onChange={(v) => updateStreamSettings({ autoRecord: v })}
            C={C}
          />
        </GroupCard>
      </Animated.View>

      {/* ── Privacy ── */}
      <SectionHeader title="Privacy" delay={380} C={C} />
      <Animated.View entering={FadeInDown.delay(400).duration(400)}>
        <GroupCard C={C}>
          <SegmentControl<CommentVisibility>
            label="Who can comment"
            options={[
              { id: 'everyone', label: 'Everyone' },
              { id: 'followers', label: 'Followers' },
              { id: 'none', label: 'No one' },
            ]}
            value={privacy.commentVisibility}
            onChange={(v) => updatePrivacy({ commentVisibility: v })}
            C={C}
          />
          <Divider C={C} />
          <SettingToggle
            icon="gift-outline"
            label="Show gifts publicly"
            sub="Gifts appear in your comment feed"
            value={privacy.showGiftsPublicly}
            onChange={(v) => updatePrivacy({ showGiftsPublicly: v })}
            C={C}
          />
          <Divider C={C} />
          <SettingToggle
            icon="eye-outline"
            label="Show viewer count"
            sub="Visible to all platforms"
            value={privacy.showViewerCount}
            onChange={(v) => updatePrivacy({ showViewerCount: v })}
            C={C}
          />
        </GroupCard>
      </Animated.View>

      {/* ── Support ── */}
      <SectionHeader title="Support" delay={500} C={C} />
      <Animated.View entering={FadeInDown.delay(520).duration(400)}>
        <GroupCard C={C}>
          <SettingLink icon="help-circle-outline" label="Help Center" sub="FAQs, guides, contact" onPress={() => {}} C={C} />
          <Divider C={C} />
          <SettingLink icon="bug-outline" label="Report a bug" onPress={() => {}} C={C} />
          <Divider C={C} />
          <SettingLink icon="star-outline" label="Rate Viba" onPress={() => {}} C={C} />
          <Divider C={C} />
          <SettingLink icon="share-social-outline" label="Share with friends" onPress={() => {}} C={C} />
        </GroupCard>
      </Animated.View>

      {/* ── Legal ── */}
      <SectionHeader title="Legal" delay={600} C={C} />
      <Animated.View entering={FadeInDown.delay(620).duration(400)}>
        <GroupCard C={C}>
          <SettingLink icon="shield-checkmark-outline" label="Privacy Policy" onPress={() => {}} C={C} />
          <Divider C={C} />
          <SettingLink icon="document-text-outline" label="Terms of Service" onPress={() => {}} C={C} />
          <Divider C={C} />
          <SettingLink icon="code-slash-outline" label="Open Source Licenses" onPress={() => {}} C={C} />
        </GroupCard>
      </Animated.View>

      {/* ── Restream ── */}
      <SectionHeader title="Restream" delay={660} C={C} />
      <Animated.View entering={FadeInDown.delay(680).duration(400)}>
        <GroupCard C={C}>
          {/* Stream key */}
          <View style={s.restreamRow}>
            <View style={[s.rowIcon, { backgroundColor: C.bgGlass }]}>
              <Ionicons name="key-outline" size={16} color={C.textSecondary} />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={[s.rowLabel, { color: C.textPrimary }]}>Stream Key</Text>
              <Text style={[s.rowSub, { color: C.textMuted }]}>
                From Restream Dashboard → Stream Setup
              </Text>
              <View style={[s.keyInputWrap, { backgroundColor: C.bgGlass, borderColor: C.border }]}>
                <TextInput
                  style={[s.keyInput, { color: C.textPrimary }]}
                  value={restreamKeyInput}
                  onChangeText={setRestreamKeyInput}
                  placeholder="re_xxxxxxxxxx_xxxxxxxxxx"
                  placeholderTextColor={C.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                />
              </View>
              <TouchableOpacity
                style={[s.saveKeyBtn, { backgroundColor: C.pink, opacity: restreamKeyInput.trim() ? 1 : 0.5 }]}
                onPress={handleSaveRestreamKey}
                disabled={!restreamKeyInput.trim() || savingKey}
                activeOpacity={0.8}
              >
                {savingKey
                  ? <ActivityIndicator size="small" color="#FFFFFF" />
                  : <Text style={s.saveKeyBtnText}>{restreamKey ? 'Update Key' : 'Save Key'}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>

          <Divider C={C} />

          {/* Connect Restream account for real chat + viewers */}
          <TouchableOpacity style={s.row} onPress={handleConnectRestream} activeOpacity={0.7} disabled={connectingRestream}>
            <View style={[s.rowIcon, { backgroundColor: restreamToken ? 'rgba(0,217,126,0.15)' : C.bgGlass }]}>
              {connectingRestream
                ? <ActivityIndicator size="small" color={C.textSecondary} />
                : <Ionicons name={restreamToken ? 'checkmark-circle' : 'link-outline'} size={16} color={restreamToken ? '#00D97E' : C.textSecondary} />
              }
            </View>
            <View style={s.rowText}>
              <Text style={[s.rowLabel, { color: C.textPrimary }]}>
                {restreamToken ? 'Restream Connected' : 'Connect Restream Account'}
              </Text>
              <Text style={[s.rowSub, { color: C.textMuted }]}>
                {restreamToken
                  ? 'Real chat & viewer counts enabled'
                  : 'Enables real-time chat and viewer counts while live'
                }
              </Text>
            </View>
            {!restreamToken && <Ionicons name="chevron-forward" size={14} color={C.textMuted} style={{ marginLeft: 4 }} />}
          </TouchableOpacity>
        </GroupCard>
      </Animated.View>

      {/* ── Account ── */}
      <SectionHeader title="Account" delay={700} C={C} />
      <Animated.View entering={FadeInDown.delay(720).duration(400)}>
        <GroupCard C={C}>
          <SettingLink icon="log-out-outline" label="Sign Out" onPress={handleSignOut} C={C} />
          <Divider C={C} />
          <SettingLink
            icon="trash-outline"
            label="Delete Account"
            sub="Permanently remove all your data"
            onPress={handleDeleteAccount}
            danger
            C={C}
          />
        </GroupCard>
      </Animated.View>

      {/* Version */}
      <Animated.View entering={FadeInDown.delay(780).duration(400)} style={s.versionBlock}>
        <Text style={[s.versionText, { color: C.textMuted }]}>Viba · Version 1.0.0</Text>
        <Text style={[s.versionSub, { color: C.textMuted }]}>Made for creators, by creators.</Text>
      </Animated.View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 6 },
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
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontFamily: 'Syne-Bold',
    fontSize: 18,
  },
  sectionHeader: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 20,
    marginBottom: 6,
    paddingLeft: 4,
  },
  groupCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconDanger: {
    backgroundColor: 'rgba(255,68,68,0.12)',
  },
  rowText: { flex: 1, gap: 1 },
  rowLabel: { fontFamily: 'DMSans-Regular', fontSize: 15 },
  rowLabelDanger: { color: '#FF4444' },
  rowSub: { fontFamily: 'DMSans-Regular', fontSize: 12 },
  rowValue: { fontFamily: 'DMSans-Medium', fontSize: 13 },
  themeIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  segmentRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  segmentLabel: { fontFamily: 'DMSans-Regular', fontSize: 15 },
  segmentGroup: {
    flexDirection: 'row',
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
  segmentText: { fontFamily: 'DMSans-Medium', fontSize: 13 },
  permBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  permBannerText: {
    flex: 1,
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
  },
  restreamRow: { flexDirection: 'row', gap: 12, padding: 14, alignItems: 'flex-start' },
  keyInputWrap: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  keyInput: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
  },
  saveKeyBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveKeyBtnText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  versionBlock: { alignItems: 'center', paddingTop: 24, paddingBottom: 8, gap: 4 },
  versionText: { fontFamily: 'DMSans-Medium', fontSize: 13 },
  versionSub: { fontFamily: 'DMSans-Regular', fontSize: 12, opacity: 0.6 },
});
