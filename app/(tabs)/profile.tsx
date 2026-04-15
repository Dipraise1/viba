import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/themes';
import { getPlatform, PlatformId } from '@/constants/platforms';
import { useApp } from '@/context/AppContext';
import { pickAndUploadAvatar } from '@/lib/avatar';
import { fetchStreamStats, fetchRecentStreams, StreamSession } from '@/lib/streams';

type OAuthStage = 'confirm' | 'loading' | 'success';

function OAuthModal({
  platformId,
  visible,
  onSuccess,
  onCancel,
}: {
  platformId: PlatformId | null;
  visible: boolean;
  onSuccess: (id: PlatformId) => void;
  onCancel: () => void;
}) {
  const [stage, setStage] = useState<OAuthStage>('confirm');
  const platform = platformId ? getPlatform(platformId) : null;
  const { colors: C } = useTheme();
  const oauthStyles = useMemo(() => makeOAuthStyles(C), [C]);

  const handleAuthorize = () => {
    if (!platformId || !platform) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStage('loading');
    setTimeout(() => {
      setStage('success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => { setStage('confirm'); onSuccess(platformId); }, 900);
    }, 2000);
  };

  const handleCancel = () => { setStage('confirm'); onCancel(); };
  if (!platform || !platformId) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleCancel}>
      <View style={oauthStyles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleCancel} activeOpacity={1} />
        <Animated.View entering={FadeInUp.duration(300).springify()} style={oauthStyles.sheet}>
          <View style={oauthStyles.handle} />
          <LinearGradient colors={platform.gradient as any} style={oauthStyles.brandIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <FontAwesome5 name={platform.icon} size={30} color="#FFFFFF" solid />
          </LinearGradient>
          {stage === 'confirm' && (
            <>
              <Text style={oauthStyles.title}>Connect {platform.name}</Text>
              <Text style={oauthStyles.sub}>Viba will stream live on your behalf. We never post without your action.</Text>
              <View style={oauthStyles.permList}>
                {['Start and manage live streams', 'Read comments during streams', 'Read gift/reward events'].map((p) => (
                  <View key={p} style={oauthStyles.permRow}>
                    <View style={[oauthStyles.permDot, { backgroundColor: platform.gradient[0] as string }]}>
                      <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                    </View>
                    <Text style={oauthStyles.permText}>{p}</Text>
                  </View>
                ))}
              </View>
              <View style={oauthStyles.actions}>
                <TouchableOpacity style={oauthStyles.cancelBtn} onPress={handleCancel} activeOpacity={0.7}>
                  <Text style={oauthStyles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={oauthStyles.authBtn} onPress={handleAuthorize} activeOpacity={0.85}>
                  <LinearGradient colors={platform.gradient as any} style={oauthStyles.authBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <FontAwesome5 name={platform.icon} size={13} color="#FFFFFF" solid />
                    <Text style={oauthStyles.authBtnText}>Authorize {platform.name}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          )}
          {stage === 'loading' && (
            <View style={oauthStyles.center}>
              <ActivityIndicator color={platform.gradient[0] as string} size="large" />
              <Text style={oauthStyles.title}>Connecting…</Text>
              <Text style={oauthStyles.sub}>Redirecting to {platform.name}</Text>
            </View>
          )}
          {stage === 'success' && (
            <Animated.View entering={ZoomIn.duration(400)} style={oauthStyles.center}>
              <View style={[oauthStyles.successCircle, { backgroundColor: platform.gradient[0] as string }]}>
                <Ionicons name="checkmark" size={30} color="#FFFFFF" />
              </View>
              <Text style={oauthStyles.title}>{platform.name} connected!</Text>
            </Animated.View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

function makeOAuthStyles(C: AppColors) {
  return StyleSheet.create({
    backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    sheet: { backgroundColor: C.bgDeep, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingBottom: 44, alignItems: 'center', gap: 14, borderTopWidth: 1, borderColor: C.border },
    handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, marginTop: 12, marginBottom: 4 },
    brandIcon: { width: 68, height: 68, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
    title: { fontFamily: 'Syne-ExtraBold', fontSize: 20, color: C.textPrimary, textAlign: 'center' },
    sub: { fontFamily: 'DMSans-Regular', fontSize: 13, color: C.textSecondary, textAlign: 'center', lineHeight: 20 },
    permList: { width: '100%', gap: 10, backgroundColor: C.bgCard, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14 },
    permRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    permDot: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    permText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: C.textSecondary, flex: 1 },
    actions: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 },
    cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 13, alignItems: 'center', backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border },
    cancelText: { fontFamily: 'DMSans-Medium', fontSize: 14, color: C.textSecondary },
    authBtn: { flex: 2, borderRadius: 13, overflow: 'hidden' },
    authBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 13 },
    authBtnText: { fontFamily: 'DMSans-Bold', fontSize: 14, color: '#FFFFFF' },
    center: { alignItems: 'center', paddingVertical: 20, gap: 12, width: '100%' },
    successCircle: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  });
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, platforms, togglePlatform } = useApp();
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [oauthTarget, setOauthTarget] = useState<PlatformId | null>(null);
  const [oauthVisible, setOauthVisible] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [stats, setStats] = useState({ totalStreams: 0, totalViewers: 0, totalEarnedUsd: 0 });
  const [recentStreams, setRecentStreams] = useState<StreamSession[]>([]);

  const connectedCount = platforms.filter((p) => p.connected).length;

  useEffect(() => {
    fetchStreamStats().then(setStats);
    fetchRecentStreams(2).then(setRecentStreams);
  }, []);

  const handleAvatarPress = async () => {
    setUploadingAvatar(true);
    try {
      const url = await pickAndUploadAvatar();
      if (url) setAvatarUri(url);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDisconnect = (id: PlatformId, name: string) => {
    Alert.alert(
      `Disconnect ${name}?`,
      `Your ${name} account will be removed from Viba. You can reconnect anytime.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            togglePlatform(id);
          },
        },
      ]
    );
  };

  const handleConnect = (id: PlatformId) => {
    setOauthTarget(id);
    setOauthVisible(true);
  };

  const handleOAuthSuccess = (id: PlatformId) => {
    setOauthVisible(false);
    setOauthTarget(null);
    togglePlatform(id);
  };

  return (
    <>
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 110 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(0).duration(500)} style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity
          style={styles.settingsBtn}
          activeOpacity={0.7}
          onPress={() => router.push('/settings')}
        >
          <Ionicons name="settings-outline" size={20} color={C.textSecondary} />
        </TouchableOpacity>
      </Animated.View>

      {/* Profile card */}
      <Animated.View entering={FadeInDown.delay(80).duration(500)}>
        <View style={styles.profileCard}>
          <LinearGradient
            colors={['rgba(255,45,135,0.14)', 'rgba(123,47,255,0.14)']}
            style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
          />
          <View style={styles.profileTop}>
            <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.85} style={styles.avatarWrap}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
              ) : (
                <LinearGradient
                  colors={['#FF2D87', '#7B2FFF']}
                  style={styles.avatar}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.avatarInitial}>
                    {profile.displayName.charAt(0).toUpperCase()}
                  </Text>
                </LinearGradient>
              )}
              {uploadingAvatar && (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                </View>
              )}
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={10} color="#FFFFFF" />
              </View>
              {connectedCount > 0 && <View style={styles.onlineBadge} />}
            </TouchableOpacity>
            <View style={styles.profileMeta}>
              <Text style={styles.profileName}>{profile.displayName}</Text>
              <Text style={styles.profileHandle}>{profile.handle}</Text>
              <View style={styles.connectedBadge}>
                <View style={styles.connectedDot} />
                <Text style={styles.connectedText}>{connectedCount} platform{connectedCount !== 1 ? 's' : ''} connected</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => router.push('/edit-profile')}
              activeOpacity={0.7}
            >
              <Ionicons name="pencil-outline" size={15} color={C.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Stats — real data from DB */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{stats.totalStreams}</Text>
              <Text style={styles.statLabel}>Streams</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {stats.totalViewers >= 1000
                  ? `${(stats.totalViewers / 1000).toFixed(1)}K`
                  : stats.totalViewers.toString()}
              </Text>
              <Text style={styles.statLabel}>Total viewers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: C.gold }]}>
                ${stats.totalEarnedUsd.toFixed(0)}
              </Text>
              <Text style={styles.statLabel}>Earned</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Platform connections */}
      <Animated.View entering={FadeInDown.delay(160).duration(500)} style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Connected accounts</Text>
        <Text style={styles.sectionSub}>{connectedCount}/5</Text>
      </Animated.View>

      <View style={styles.platformGrid}>
        {platforms.map((p, index) => {
          const platform = getPlatform(p.id);
          return (
            <Animated.View
              key={p.id}
              entering={FadeInDown.delay(200 + index * 40).duration(400)}
              style={styles.platformCell}
            >
              <TouchableOpacity
                style={[styles.platformCellInner, p.connected && styles.platformCellActive]}
                onPress={() => p.connected ? handleDisconnect(p.id, platform.name) : handleConnect(p.id)}
                activeOpacity={0.75}
              >
                <View style={[styles.platformCellIcon, { backgroundColor: platform.gradient[0] as string }]}>
                  <FontAwesome5 name={platform.icon} size={13} color="#FFFFFF" solid />
                </View>
                <View style={styles.platformCellMeta}>
                  <Text style={styles.platformCellName} numberOfLines={1}>{platform.name}</Text>
                  <Text style={[styles.platformCellStatus, p.connected && { color: C.success }]} numberOfLines={1}>
                    {p.connected ? (p.username ?? 'Connected') : 'Tap to add'}
                  </Text>
                </View>
                {p.connected
                  ? <View style={styles.connectedCheck}><Ionicons name="checkmark" size={10} color={C.success} /></View>
                  : <Ionicons name="add-circle-outline" size={16} color={C.textMuted} />
                }
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>

      {/* Stream history preview */}
      <Animated.View entering={FadeInDown.delay(520).duration(500)} style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent streams</Text>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/streams')}>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.historyList}>
        {recentStreams.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Ionicons name="radio-outline" size={28} color={C.textMuted} />
            <Text style={styles.emptyHistoryText}>No streams yet. Go live to see your history here.</Text>
          </View>
        ) : (
          recentStreams.map((s, i) => {
            const mins = s.duration_secs ? Math.floor(s.duration_secs / 60) : null;
            const durLabel = mins
              ? mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`
              : null;
            const date = new Date(s.started_at);
            const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return (
              <Animated.View
                key={s.id}
                entering={FadeInDown.delay(560 + i * 50).duration(400)}
                style={styles.historyRow}
              >
                <View style={styles.historyDot} />
                <View style={styles.historyInfo}>
                  <Text style={styles.historyTitle}>{s.title ?? 'Untitled stream'}</Text>
                  <View style={styles.historyMeta}>
                    <Text style={styles.historyMetaText}>{dateLabel}</Text>
                    {durLabel && <>
                      <Text style={styles.historyMetaDot}>·</Text>
                      <Text style={styles.historyMetaText}>{durLabel}</Text>
                    </>}
                    <Text style={styles.historyMetaDot}>·</Text>
                    <Ionicons name="eye-outline" size={11} color={C.textMuted} />
                    <Text style={styles.historyMetaText}>{s.peak_viewers.toLocaleString()}</Text>
                  </View>
                </View>
                <Text style={styles.historyGifts}>
                  ${parseFloat(s.total_gifts_usd as any ?? '0').toFixed(0)}
                </Text>
              </Animated.View>
            );
          })
        )}
      </View>

    </ScrollView>

    <OAuthModal
      platformId={oauthTarget}
      visible={oauthVisible}
      onSuccess={handleOAuthSuccess}
      onCancel={() => { setOauthVisible(false); setOauthTarget(null); }}
    />
    </>
  );
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    content: { paddingHorizontal: 20, gap: 12 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerTitle: { fontFamily: 'Syne-ExtraBold', fontSize: 28, color: C.textPrimary },
    settingsBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
    profileCard: { borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 20, overflow: 'hidden', gap: 16 },
    profileTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
    avatarWrap: { position: 'relative' },
    avatar: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    avatarImg: { width: 64, height: 64, borderRadius: 20 },
    avatarOverlay: { position: 'absolute', inset: 0, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
    avatarEditBadge: { position: 'absolute', bottom: -4, right: -4, width: 20, height: 20, borderRadius: 10, backgroundColor: C.pink, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: C.bg },
    avatarInitial: { fontFamily: 'Syne-ExtraBold', fontSize: 26, color: '#FFFFFF' },
    onlineBadge: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: C.success, borderWidth: 2, borderColor: C.bg },
    profileMeta: { flex: 1, gap: 3 },
    profileName: { fontFamily: 'Syne-Bold', fontSize: 20, color: C.textPrimary },
    profileHandle: { fontFamily: 'DMSans-Regular', fontSize: 13, color: C.textMuted },
    connectedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
    connectedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.success },
    connectedText: { fontFamily: 'DMSans-Regular', fontSize: 12, color: C.success },
    editBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.bgGlass, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
    statsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.border, paddingTop: 14 },
    stat: { flex: 1, alignItems: 'center', gap: 2 },
    statValue: { fontFamily: 'Syne-Bold', fontSize: 17, color: C.textPrimary },
    statLabel: { fontFamily: 'DMSans-Regular', fontSize: 11, color: C.textMuted },
    statDivider: { width: 1, height: 32, backgroundColor: C.border, alignSelf: 'center' },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
    sectionTitle: { fontFamily: 'Syne-Bold', fontSize: 16, color: C.textPrimary },
    sectionSub: { fontFamily: 'DMSans-Regular', fontSize: 13, color: C.textMuted },
    seeAll: { fontFamily: 'DMSans-Medium', fontSize: 13, color: C.pink },
    platformGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    platformCell: { width: '48%' },
    platformCellInner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.bgCard, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 12 },
    platformCellActive: { borderColor: C.success + '40', backgroundColor: C.successDim },
    platformCellIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    platformCellMeta: { flex: 1, gap: 1 },
    platformCellName: { fontFamily: 'DMSans-Bold', fontSize: 12, color: C.textPrimary },
    platformCellStatus: { fontFamily: 'DMSans-Regular', fontSize: 11, color: C.textMuted },
    connectedCheck: { width: 18, height: 18, borderRadius: 9, backgroundColor: C.successDim, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    historyList: { gap: 0 },
    emptyHistory: { alignItems: 'center', paddingVertical: 28, gap: 10 },
    emptyHistoryText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 20 },
    historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: C.border },
    historyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.border },
    historyInfo: { flex: 1, gap: 3 },
    historyTitle: { fontFamily: 'DMSans-Medium', fontSize: 14, color: C.textPrimary },
    historyMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    historyMetaText: { fontFamily: 'DMSans-Regular', fontSize: 12, color: C.textMuted },
    historyMetaDot: { fontFamily: 'DMSans-Regular', fontSize: 12, color: C.textMuted },
    historyGifts: { fontFamily: 'Syne-Bold', fontSize: 14, color: C.gold },
  });
}
