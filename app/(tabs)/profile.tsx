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
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/themes';
import { getPlatform, PlatformId } from '@/constants/platforms';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { pickAndUploadAvatar } from '@/lib/avatar';
import { fetchStreamStats, fetchRecentStreams, StreamSession } from '@/lib/streams';
import { getRestreamAddChannelUrl } from '@/lib/restream';
import { getFollowerCount } from '@/lib/feed';
import { supabase } from '@/lib/supabase';
import * as WebBrowser from 'expo-web-browser';

const DIRECT_OAUTH_PLATFORMS = new Set(['youtube', 'twitch', 'facebook']);

const PLATFORM_PERKS: Record<string, string[]> = {
  youtube:  ['Go live directly to YouTube', 'Stream key auto-fetched', 'No Restream needed'],
  twitch:   ['Go live directly to Twitch', 'Stream key auto-fetched', 'No Restream needed'],
  facebook: ['Go live directly to Facebook', 'Access token stored securely', 'No Restream needed'],
  tiktok:   ['Stream to TikTok via Restream', 'See real-time TikTok comments', 'Free up to 2 platforms'],
  instagram:['Stream to Instagram via Restream', 'Unified comment feed', 'Free up to 2 platforms'],
};

// ─── Connect modal ────────────────────────────────────────────────────────────

function ConnectModal({
  platformId, visible, onDone, onCancel,
}: {
  platformId: PlatformId | null; visible: boolean; onDone: () => void; onCancel: () => void;
}) {
  const [connecting, setConnecting] = useState(false);
  const platform = platformId ? getPlatform(platformId) : null;
  const { colors: C } = useTheme();
  const oauthStyles = useMemo(() => makeOAuthStyles(C), [C]);
  const { connectPlatformOAuth } = useApp();
  const isDirect = platformId ? DIRECT_OAUTH_PLATFORMS.has(platformId) : false;
  const perks = platformId ? (PLATFORM_PERKS[platformId] ?? []) : [];

  const handleConnect = async () => {
    if (!platformId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setConnecting(true);
    try {
      if (isDirect) {
        await connectPlatformOAuth(platformId as 'youtube' | 'twitch' | 'facebook');
        onDone();
      } else {
        const url = getRestreamAddChannelUrl(platformId);
        await WebBrowser.openBrowserAsync(url, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET });
        onDone();
      }
    } catch (e: any) {
      if (!e?.message?.includes('cancelled'))
        Alert.alert('Connection failed', e?.message ?? 'Could not connect. Try again.');
    } finally {
      setConnecting(false);
    }
  };

  if (!platform || !platformId) return null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={oauthStyles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onCancel} activeOpacity={1} />
        <Animated.View entering={FadeInUp.duration(300).springify()} style={oauthStyles.sheet}>
          <View style={oauthStyles.handle} />
          <LinearGradient colors={platform.gradient as any} style={oauthStyles.brandIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <FontAwesome5 name={platform.icon} size={30} color="#FFFFFF" solid />
          </LinearGradient>
          <Text style={oauthStyles.title}>Connect {platform.name}</Text>
          <Text style={oauthStyles.sub}>
            {isDirect
              ? `Sign in with ${platform.name} to connect directly. Viba will auto-fetch your stream key.`
              : `You'll be taken to Restream to connect ${platform.name}. Come back once done.`}
          </Text>
          <View style={oauthStyles.permList}>
            {perks.map((p) => (
              <View key={p} style={oauthStyles.permRow}>
                <View style={[oauthStyles.permDot, { backgroundColor: platform.gradient[0] as string }]}>
                  <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                </View>
                <Text style={oauthStyles.permText}>{p}</Text>
              </View>
            ))}
          </View>
          <View style={oauthStyles.actions}>
            <TouchableOpacity style={oauthStyles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
              <Text style={oauthStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={oauthStyles.authBtn} onPress={handleConnect} activeOpacity={0.85} disabled={connecting}>
              <LinearGradient colors={platform.gradient as any} style={oauthStyles.authBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {connecting
                  ? <ActivityIndicator color="#FFFFFF" size="small" />
                  : <><FontAwesome5 name={platform.icon} size={13} color="#FFFFFF" solid /><Text style={oauthStyles.authBtnText}>{isDirect ? `Continue with ${platform.name}` : 'Connect via Restream'}</Text></>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
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
  });
}

// ─── Post grid data ───────────────────────────────────────────────────────────

const { width: SCREEN_W } = Dimensions.get('window');
const POST_GAP = 2;
const POST_CELL = Math.floor((SCREEN_W - 40 - POST_GAP * 2) / 3);
const POST_CELL_H = Math.floor(POST_CELL * 1.35);

interface PostRow {
  id: string;
  thumbnail_url: string | null;
  status: string;
  views: number;
  created_at: string;
}

function fmtViews(v: number) {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(v);
}

type ContentTab = 'posts' | 'drafts' | 'reposts' | 'streams';

// ─── Post grid ────────────────────────────────────────────────────────────────

function PostGrid({
  posts, isDraft, styles, C,
}: {
  posts: PostRow[];
  isDraft?: boolean;
  styles: ReturnType<typeof makeStyles>;
  C: AppColors;
}) {
  if (posts.length === 0) return null;
  return (
    <View style={styles.postsGrid}>
      {posts.map((post) => (
        <TouchableOpacity
          key={post.id}
          activeOpacity={0.85}
          style={[styles.postCell, { width: POST_CELL, height: POST_CELL_H }]}
        >
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#111' }]} />
          {post.thumbnail_url ? (
            <Image source={{ uri: post.thumbnail_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <LinearGradient
              colors={['#1a1a2e', '#16213e', '#0f3460']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.65)']}
            style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end' }]}
          >
            {isDraft && (
              <View style={[styles.postLiveBadge, { backgroundColor: 'rgba(0,0,0,0.72)' }]}>
                <Text style={styles.postLiveText}>DRAFT</Text>
              </View>
            )}
            <View style={styles.postViewsRow}>
              <Ionicons name={isDraft ? 'time-outline' : 'eye'} size={10} color="rgba(255,255,255,0.9)" />
              <Text style={styles.postViewsText}>{isDraft ? 'Draft' : fmtViews(post.views)}</Text>
            </View>
          </LinearGradient>
          <View style={styles.postPlayOverlay}>
            <Ionicons name="play" size={26} color="rgba(255,255,255,0.8)" />
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Profile screen ───────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, platforms, togglePlatform, syncPlatformsFromRestream, restreamToken, connectPlatformOAuth } = useApp();
  const { user } = useAuth();
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [oauthTarget, setOauthTarget] = useState<PlatformId | null>(null);
  const [oauthVisible, setOauthVisible] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [stats, setStats] = useState({ totalStreams: 0, totalViewers: 0, totalEarnedUsd: 0 });
  const [recentStreams, setRecentStreams] = useState<StreamSession[]>([]);
  const [contentTab, setContentTab] = useState<ContentTab>('posts');
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [drafts, setDrafts] = useState<PostRow[]>([]);
  const [vbtBalance, setVbtBalance] = useState<number>(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const connectedCount = platforms.filter((p) => p.connected).length;

  useEffect(() => {
    fetchStreamStats().then(setStats);
    fetchRecentStreams(4).then(setRecentStreams);
    if (!user) return;

    // Real posts
    supabase
      .from('posts')
      .select('id, thumbnail_url, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const rows = (data ?? []) as PostRow[];
        setPosts(rows.filter((p) => p.status === 'published').map((p) => ({ ...p, views: 0 })));
        setDrafts(rows.filter((p) => p.status === 'draft').map((p) => ({ ...p, views: 0 })));
      });

    // VBT balance
    supabase
      .from('vbt_balances')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setVbtBalance(data?.balance ?? 0));

    // Follower / following counts
    Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
    ]).then(([frs, fng]) => {
      setFollowerCount(frs.count ?? 0);
      setFollowingCount(fng.count ?? 0);
    });
  }, [user?.id]);

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
    Alert.alert(`Disconnect ${name}?`, `Your ${name} account will be removed from Viba.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); togglePlatform(id); } },
    ]);
  };

  const handleConnect = (id: PlatformId) => { setOauthTarget(id); setOauthVisible(true); };

  const handleConnectDone = async () => {
    setOauthVisible(false);
    const wasRestream = oauthTarget && !DIRECT_OAUTH_PLATFORMS.has(oauthTarget);
    if (wasRestream && restreamToken) { setSyncing(true); await syncPlatformsFromRestream(); setSyncing(false); }
    setOauthTarget(null);
  };

  const CONTENT_TABS: { key: ContentTab; label: string; icon: string }[] = [
    { key: 'posts',   label: 'Posts',   icon: 'grid-outline' },
    { key: 'drafts',  label: 'Drafts',  icon: 'document-text-outline' },
    { key: 'reposts', label: 'Reposts', icon: 'repeat-outline' },
    { key: 'streams', label: 'Streams', icon: 'radio-outline' },
  ];

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(0).duration(500)} style={styles.header}>
          <TouchableOpacity style={styles.settingsBtn} activeOpacity={0.7} onPress={() => router.push('/settings')}>
            <Ionicons name="settings-outline" size={20} color={C.textSecondary} />
          </TouchableOpacity>
        </Animated.View>

        {/* Profile card */}
        <Animated.View entering={FadeInDown.delay(80).duration(500)}>
          <View style={styles.profileCard}>
            <LinearGradient colors={['rgba(255,45,135,0.14)', 'rgba(123,47,255,0.14)']} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />
            <View style={styles.profileTop}>
              <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.85} style={styles.avatarWrap}>
                {avatarUri
                  ? <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
                  : <LinearGradient colors={['#FF2D87', '#7B2FFF']} style={styles.avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                      <Text style={styles.avatarInitial}>{profile.displayName.charAt(0).toUpperCase()}</Text>
                    </LinearGradient>}
                {uploadingAvatar && <View style={styles.avatarOverlay}><ActivityIndicator color="#FFFFFF" size="small" /></View>}
                <View style={styles.avatarEditBadge}><Ionicons name="camera" size={10} color="#FFFFFF" /></View>
              </TouchableOpacity>
              <View style={styles.profileMeta}>
                <Text style={styles.profileName}>{profile.displayName}</Text>
                <Text style={styles.profileHandle}>{profile.handle}</Text>
                <View style={styles.connectedBadge}>
                  <View style={styles.connectedDot} />
                  <Text style={styles.connectedText}>{connectedCount} platform{connectedCount !== 1 ? 's' : ''} linked</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/edit-profile')} activeOpacity={0.7}>
                <Ionicons name="pencil-outline" size={15} color={C.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <TouchableOpacity style={styles.stat} activeOpacity={0.7} onPress={() => router.push('/followers')}>
                <Text style={styles.statValue}>{followerCount >= 1000 ? `${(followerCount / 1000).toFixed(1)}K` : followerCount}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </TouchableOpacity>
              <View style={styles.statDivider} />
              <TouchableOpacity style={styles.stat} activeOpacity={0.7} onPress={() => router.push('/following')}>
                <Text style={styles.statValue}>{followingCount}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </TouchableOpacity>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{stats.totalStreams}</Text>
                <Text style={styles.statLabel}>Streams</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Viba token balance */}
        <Animated.View entering={FadeInDown.delay(130).duration(500)}>
          <LinearGradient
            colors={['#FF2D87', '#C020E0', '#7B2FFF']}
            style={styles.tokenCard}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <View style={styles.tokenLeft}>
              <View style={styles.tokenIconWrap}>
                <Ionicons name="logo-bitcoin" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.tokenInfo}>
                <Text style={styles.tokenLabel}>Viba Balance</Text>
                <Text style={styles.tokenAmount}>{vbtBalance.toLocaleString()} VBT</Text>
              </View>
            </View>
            <View style={styles.tokenRight}>
              <TouchableOpacity style={styles.tokenBtn} activeOpacity={0.85}>
                <Text style={styles.tokenBtnText}>Withdraw</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tokenEarnBtn} activeOpacity={0.85} onPress={() => router.push('/gift-analytics')}>
                <Ionicons name="trending-up" size={14} color="rgba(255,255,255,0.85)" />
                <Text style={styles.tokenEarnText}>Earn more</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Compact platform row */}
        <Animated.View entering={FadeInDown.delay(160).duration(500)}>
          <View style={styles.platformRowHeader}>
            <Text style={styles.sectionTitle}>Platforms</Text>
            <TouchableOpacity
              style={styles.syncBtn}
              onPress={async () => { setSyncing(true); await syncPlatformsFromRestream(); setSyncing(false); }}
              activeOpacity={0.7}
              disabled={syncing || !restreamToken}
            >
              {syncing
                ? <ActivityIndicator size="small" color={C.pink} />
                : <Ionicons name="refresh-outline" size={15} color={restreamToken ? C.pink : C.textMuted} />}
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.platformChips}
          >
            {platforms.map((p) => {
              const platform = getPlatform(p.id);
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.platformChip, p.connected && { borderColor: C.success + '60', backgroundColor: C.successDim }]}
                  onPress={() => p.connected ? handleDisconnect(p.id, platform.name) : handleConnect(p.id)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.platformChipIcon, { backgroundColor: platform.gradient[0] as string }]}>
                    <FontAwesome5 name={platform.icon} size={11} color="#FFFFFF" solid />
                  </View>
                  <Text style={[styles.platformChipName, p.connected && { color: C.success }]}>{platform.name}</Text>
                  {p.connected && <View style={styles.platformChipDot} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Content catalog tabs */}
        <Animated.View entering={FadeInDown.delay(280).duration(400)} style={styles.catalogTabRow}>
          {CONTENT_TABS.map((tab) => {
            const active = contentTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.catalogTabBtn}
                activeOpacity={0.75}
                onPress={() => { Haptics.selectionAsync(); setContentTab(tab.key); }}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={16}
                  color={active ? C.textPrimary : C.textMuted}
                />
                <Text style={[styles.catalogTabLabel, active && { color: C.textPrimary }]}>{tab.label}</Text>
                {active && (
                  <LinearGradient
                    colors={['#FF2D87', '#7B2FFF']}
                    style={styles.catalogTabUnderline}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </Animated.View>

        {/* Content area */}
        <Animated.View entering={FadeInDown.delay(340).duration(400)}>
          {contentTab === 'posts' && (
            posts.length > 0
              ? <PostGrid posts={posts} styles={styles} C={C} />
              : <View style={styles.emptyContent}>
                  <Ionicons name="grid-outline" size={36} color={C.textMuted} />
                  <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>No posts yet</Text>
                  <Text style={[styles.emptySub, { color: C.textMuted }]}>Your published content will appear here.</Text>
                </View>
          )}
          {contentTab === 'drafts' && (
            drafts.length > 0
              ? <PostGrid posts={drafts} isDraft styles={styles} C={C} />
              : <View style={styles.emptyContent}>
                  <Ionicons name="document-text-outline" size={36} color={C.textMuted} />
                  <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>No drafts yet</Text>
                  <Text style={[styles.emptySub, { color: C.textMuted }]}>Videos you save as drafts will appear here.</Text>
                </View>
          )}
          {contentTab === 'reposts' && (
            <View style={styles.emptyContent}>
              <Ionicons name="repeat-outline" size={36} color={C.textMuted} />
              <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>No reposts yet</Text>
              <Text style={[styles.emptySub, { color: C.textMuted }]}>Videos you repost will appear here.</Text>
            </View>
          )}
          {contentTab === 'streams' && (
            <View style={styles.historyList}>
              {recentStreams.length === 0 ? (
                <View style={styles.emptyContent}>
                  <Ionicons name="radio-outline" size={36} color={C.textMuted} />
                  <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>No streams yet</Text>
                  <Text style={[styles.emptySub, { color: C.textMuted }]}>Go live to see your history here.</Text>
                </View>
              ) : (
                recentStreams.map((s, i) => {
                  const mins = s.duration_secs ? Math.floor(s.duration_secs / 60) : null;
                  const durLabel = mins ? (mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`) : null;
                  const date = new Date(s.started_at);
                  const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  return (
                    <View key={s.id} style={styles.historyRow}>
                      <View style={styles.historyDot} />
                      <View style={styles.historyInfo}>
                        <Text style={styles.historyTitle}>{s.title ?? 'Untitled stream'}</Text>
                        <View style={styles.historyMeta}>
                          <Text style={styles.historyMetaText}>{dateLabel}</Text>
                          {durLabel && <><Text style={styles.historyMetaDot}>·</Text><Text style={styles.historyMetaText}>{durLabel}</Text></>}
                          <Text style={styles.historyMetaDot}>·</Text>
                          <Ionicons name="eye-outline" size={11} color={C.textMuted} />
                          <Text style={styles.historyMetaText}>{s.peak_viewers.toLocaleString()}</Text>
                        </View>
                      </View>
                      <Text style={styles.historyGifts}>${parseFloat(s.total_gifts_usd as any ?? '0').toFixed(0)}</Text>
                    </View>
                  );
                })
              )}
              {recentStreams.length > 0 && (
                <TouchableOpacity style={styles.seeAllBtn} activeOpacity={0.7} onPress={() => router.push('/streams')}>
                  <Text style={[styles.seeAllText, { color: C.pink }]}>See all streams</Text>
                  <Ionicons name="chevron-forward" size={14} color={C.pink} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <ConnectModal
        platformId={oauthTarget}
        visible={oauthVisible}
        onDone={handleConnectDone}
        onCancel={() => { setOauthVisible(false); setOauthTarget(null); }}
      />
    </>
  );
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    content: { paddingHorizontal: 20, gap: 14 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
    headerTitle: { fontFamily: 'Syne-ExtraBold', fontSize: 28, color: C.textPrimary },
    settingsBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
    profileCard: { borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 20, overflow: 'hidden', gap: 16 },
    profileTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
    avatarWrap: { position: 'relative' },
    avatar: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    avatarImg: { width: 64, height: 64, borderRadius: 20 },
    avatarOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
    avatarEditBadge: { position: 'absolute', bottom: -4, right: -4, width: 20, height: 20, borderRadius: 10, backgroundColor: C.pink, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: C.bg },
    avatarInitial: { fontFamily: 'Syne-ExtraBold', fontSize: 26, color: '#FFFFFF' },
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
    // Token balance card
    tokenCard: { borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    tokenLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    tokenIconWrap: { width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    tokenInfo: { gap: 2 },
    tokenLabel: { fontFamily: 'DMSans-Regular', fontSize: 12, color: 'rgba(255,255,255,0.75)' },
    tokenAmount: { fontFamily: 'Syne-Bold', fontSize: 20, color: '#FFFFFF' },
    tokenRight: { alignItems: 'flex-end', gap: 6 },
    tokenBtn: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
    tokenBtnText: { fontFamily: 'DMSans-Bold', fontSize: 13, color: '#FFFFFF' },
    tokenEarnBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    tokenEarnText: { fontFamily: 'DMSans-Regular', fontSize: 12, color: 'rgba(255,255,255,0.8)' },
    // Compact platform row
    platformRowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sectionTitle: { fontFamily: 'Syne-Bold', fontSize: 15, color: C.textPrimary },
    syncBtn: { width: 30, height: 30, borderRadius: 9, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
    platformChips: { gap: 8, paddingVertical: 4 },
    platformChip: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border },
    platformChipIcon: { width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
    platformChipName: { fontFamily: 'DMSans-Medium', fontSize: 12, color: C.textSecondary },
    platformChipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.success },
    // Catalog tabs
    catalogTabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border },
    catalogTabBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 4 },
    catalogTabLabel: { fontFamily: 'DMSans-Medium', fontSize: 11, color: C.textMuted },
    catalogTabUnderline: { height: 2, width: 28, borderRadius: 1 },
    // Posts grid
    postsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: POST_GAP },
    postCell: { borderRadius: 8, overflow: 'hidden', position: 'relative' },
    postLiveBadge: { position: 'absolute', top: 8, left: 8, zIndex: 2, backgroundColor: '#FF2D87', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
    postLiveText: { fontFamily: 'DMSans-Bold', fontSize: 9, color: '#FFFFFF', letterSpacing: 0.5 },
    postRepostBadge: { position: 'absolute', top: 8, left: 8, zIndex: 2, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 5, padding: 4 },
    postPlayOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
    postViewsRow: { paddingHorizontal: 8, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
    postViewsText: { fontFamily: 'DMSans-Bold', fontSize: 10, color: '#FFFFFF' },
    // Streams list
    historyList: { gap: 0 },
    historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, gap: 12, borderBottomWidth: 1, borderBottomColor: C.border },
    historyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.pink },
    historyInfo: { flex: 1, gap: 3 },
    historyTitle: { fontFamily: 'DMSans-Medium', fontSize: 14, color: C.textPrimary },
    historyMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    historyMetaText: { fontFamily: 'DMSans-Regular', fontSize: 12, color: C.textMuted },
    historyMetaDot: { fontFamily: 'DMSans-Regular', fontSize: 12, color: C.textMuted },
    historyGifts: { fontFamily: 'Syne-Bold', fontSize: 14, color: C.gold },
    seeAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 4 },
    seeAllText: { fontFamily: 'DMSans-Bold', fontSize: 13 },
    // Empty states
    emptyContent: { alignItems: 'center', paddingVertical: 48, gap: 10 },
    emptyTitle: { fontFamily: 'Syne-Bold', fontSize: 16 },
    emptySub: { fontFamily: 'DMSans-Regular', fontSize: 13, textAlign: 'center', lineHeight: 20, maxWidth: 240, color: C.textMuted },
    seeAll: { fontFamily: 'DMSans-Medium', fontSize: 13, color: C.pink },
  });
}
