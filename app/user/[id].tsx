import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  Linking,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/themes';
import { supabase } from '@/lib/supabase';
import { getPlatform } from '@/constants/platforms';
import { useAuth } from '@/context/AuthContext';
import { followCreator, unfollowCreator, checkIsFollowing, getFollowerCount } from '@/lib/feed';

const { width: W } = Dimensions.get('window');
const POST_GAP = 2;
const POST_CELL = Math.floor((W - POST_GAP * 2) / 3); // edge-to-edge, no side padding
const POST_CELL_H = Math.floor(POST_CELL * 1.35);

interface Creator {
  id: string;
  handle: string;
  display_name: string;
  bio?: string | null;
  total_viewers: number;
  platforms: string[] | null;
  is_live: boolean;
  stream_count: number;
  last_streamed_at: string | null;
}

interface RealStats {
  follower_count: number;
  following_count: number;
  post_count: number;
  stream_count: number;
}

const GRADIENT_POOL: [string, string, string][] = [
  ['#FF2D87', '#C020E0', '#7B2FFF'],
  ['#FF6B35', '#FF2D87', '#C020E0'],
  ['#00D4AA', '#0094FF', '#7B2FFF'],
  ['#FFD700', '#FF6B35', '#FF2D87'],
  ['#00C9FF', '#92FE9D', '#00D4AA'],
  ['#FC466B', '#3F5EFB', '#7B2FFF'],
  ['#f7971e', '#ffd200', '#FF6B35'],
  ['#11998e', '#38ef7d', '#00D4AA'],
];

function creatorGrad(id: string): [string, string, string] {
  return GRADIENT_POOL[id.charCodeAt(0) % GRADIENT_POOL.length];
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0] ?? '').join('').toUpperCase().slice(0, 2) || '??';
}

const BIOS = [
  'Content creator · Streaming daily 🎙️',
  'Gamer · Streamer · Vibe curator 🎮',
  'Music producer & live performer 🎵',
  'Beauty creator | Tutorials every week ✨',
  'Fitness coach · Going live Mon–Fri 💪',
  'Artist · Painting live for you 🎨',
  'Talk show host · Real conversations 🎤',
  'Dance content · New videos daily 💃',
];

function getBio(id: string) {
  return BIOS[id.charCodeAt(0) % BIOS.length];
}

const ALL_PLATFORM_IDS = ['tiktok', 'instagram', 'youtube', 'twitch', 'facebook'];

function mockPlatformsForId(creatorId: string): string[] {
  if (!creatorId) return ['tiktok', 'instagram'];
  const seed = creatorId.charCodeAt(0) + (creatorId.charCodeAt(creatorId.length - 1) || 0);
  const count = 2 + (seed % 2);
  const start = seed % ALL_PLATFORM_IDS.length;
  return Array.from({ length: count }, (_, i) => ALL_PLATFORM_IDS[(start + i) % ALL_PLATFORM_IDS.length]);
}

const PLATFORM_URL_TEMPLATES: Record<string, (handle: string) => string> = {
  tiktok: (h) => `https://tiktok.com/@${h}`,
  instagram: (h) => `https://instagram.com/${h}`,
  facebook: (h) => `https://facebook.com/${h}`,
  youtube: (h) => `https://youtube.com/@${h}`,
  twitch: (h) => `https://twitch.tv/${h}`,
};

function openPlatform(platformId: string, handle: string) {
  const builder = PLATFORM_URL_TEMPLATES[platformId];
  if (builder) Linking.openURL(builder(handle));
}

// Deterministic mock stats seeded from creator id
function getStats(id: string) {
  const seed = id.charCodeAt(0) + (id.charCodeAt(id.length - 1) || 0);
  return {
    followers: 1200 + (seed * 317) % 98000,
    following: 80 + (seed * 53) % 900,
    posts: 8 + (seed * 7) % 120,
  };
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function UserProfileScreen() {
  const { id, name: paramName, handle: paramHandle } = useLocalSearchParams<{ id: string; name?: string; handle?: string }>();
  const insets = useSafeAreaInsets();
  const { colors: C } = useTheme();
  const { user: me } = useAuth();
  const styles = useMemo(() => makeStyles(C), [C]);

  const [creator, setCreator] = useState<Creator | null>(null);
  const [platformUsernames, setPlatformUsernames] = useState<Record<string, string>>({});
  const [realStats, setRealStats] = useState<RealStats | null>(null);
  const [userPosts, setUserPosts] = useState<{ id: string; thumbnail_url: string | null; views: number }[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [contentTab, setContentTab] = useState<'posts' | 'streams'>('posts');

  useEffect(() => {
    async function init() {
      // Try full profile from profiles table first (has bio)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, display_name, handle, bio, avatar_url')
        .eq('id', id)
        .maybeSingle();

      // Fallback to creator_discover if profile not found
      const { data: discoverData } = profileData ? { data: null } : await supabase
        .from('creator_discover')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      let resolved: Creator;
      if (profileData) {
        resolved = {
          id: profileData.id,
          handle: (profileData.handle ?? '').replace(/^@/, ''),
          display_name: profileData.display_name,
          bio: profileData.bio,
          total_viewers: 0,
          platforms: null,
          is_live: false,
          stream_count: 0,
          last_streamed_at: null,
        };
      } else if (discoverData) {
        resolved = discoverData as Creator;
      } else if (paramName) {
        const handle = (paramHandle ?? paramName).replace(/^@/, '').replace(/\s+/g, '').toLowerCase();
        resolved = {
          id,
          handle,
          display_name: paramName,
          total_viewers: 0,
          platforms: mockPlatformsForId(id),
          is_live: false,
          stream_count: 0,
          last_streamed_at: null,
        };
      } else {
        setLoading(false);
        return;
      }
      setCreator(resolved);

      // Fetch stats, platforms, follow state, and posts in parallel
      const [platResult, followResult, statsResult, postsResult] = await Promise.all([
        supabase.from('connected_platforms').select('platform, username').eq('user_id', resolved.id),
        me ? checkIsFollowing(me.id, resolved.id) : Promise.resolve(false),
        supabase.from('user_stats').select('*').eq('user_id', resolved.id).maybeSingle(),
        supabase.from('posts').select('id, thumbnail_url').eq('user_id', resolved.id).eq('status', 'published').order('created_at', { ascending: false }).limit(12),
      ]);

      const names: Record<string, string> = {};
      (platResult.data ?? []).forEach((r: { platform: string; username: string | null }) => {
        if (r.username) names[r.platform] = r.username;
      });
      setPlatformUsernames(names);
      setFollowing(followResult);

      if (statsResult.data) {
        setRealStats(statsResult.data as RealStats);
        setFollowerCount(statsResult.data.follower_count ?? 0);
      } else {
        setFollowerCount(await getFollowerCount(resolved.id));
      }

      setUserPosts((postsResult.data ?? []).map((p: { id: string; thumbnail_url: string | null }) => ({
        ...p,
        views: 0,
      })));

      setLoading(false);
    }

    init();
  }, [id, me?.id]);

  const grad = creator ? creatorGrad(creator.id) : (['#FF2D87', '#C020E0', '#7B2FFF'] as [string, string, string]);
  const mockStats = creator ? getStats(creator.id) : { followers: 0, following: 0, posts: 0 };
  const bio = creator?.bio || (creator ? getBio(creator.id) : '');
  const platforms = (creator?.platforms?.length ? creator.platforms : mockPlatformsForId(creator?.id ?? '')).slice(0, 5);
  const displayFollowers = followerCount || realStats?.follower_count || mockStats.followers;
  const displayFollowing = realStats?.following_count ?? mockStats.following;
  const displayPosts     = realStats?.post_count ?? userPosts.length;

  const handleFollow = async () => {
    if (!me || followLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFollowLoading(true);
    const next = !following;
    setFollowing(next);
    setFollowerCount((c) => c + (next ? 1 : -1));
    try {
      if (next) {
        await followCreator(me.id, creator!.id);
      } else {
        await unfollowCreator(me.id, creator!.id);
      }
    } catch {
      // revert optimistic update on error
      setFollowing(!next);
      setFollowerCount((c) => c + (next ? -1 : 1));
    } finally {
      setFollowLoading(false);
    }
  };

  const fmtNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n);

  if (loading) {
    return (
      <View style={[styles.loadingWrap, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backBtnAbs} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
          <Ionicons name="chevron-back" size={24} color={C.textPrimary} />
        </TouchableOpacity>
        <ActivityIndicator color={C.pink} size="large" />
      </View>
    );
  }

  if (!creator) {
    return (
      <View style={[styles.loadingWrap, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backBtnAbs} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
          <Ionicons name="chevron-back" size={24} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={{ color: C.textMuted, fontFamily: 'DMSans-Regular' }}>User not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* ── Cover + avatar ── */}
        <View style={styles.coverWrap}>
          <LinearGradient
            colors={[grad[0] + 'AA', grad[1] + '88', grad[2] + '55']}
            style={styles.cover}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          />
          {/* Live badge on cover */}
          {creator.is_live && (
            <View style={styles.liveOnCover}>
              <View style={styles.liveDot} />
              <Text style={styles.liveCoverText}>LIVE</Text>
            </View>
          )}
        </View>

        {/* ── Profile info ── */}
        <View style={styles.profileSection}>
          {/* Avatar */}
          <View style={styles.avatarWrap}>
            <LinearGradient colors={grad} style={styles.avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={styles.avatarText}>{initials(creator.display_name || creator.handle)}</Text>
            </LinearGradient>
            {creator.is_live && <View style={[styles.onlineDot, { borderColor: C.bg }]} />}
          </View>

          {/* Name + handle + bio */}
          <Animated.View entering={FadeInDown.delay(60).duration(350)} style={styles.nameBlock}>
            <Text style={[styles.displayName, { color: C.textPrimary }]}>
              {creator.display_name || creator.handle}
            </Text>
            <Text style={[styles.handle, { color: C.textMuted }]}>@{creator.handle}</Text>
            <Text style={[styles.bio, { color: C.textSecondary }]}>{bio}</Text>
          </Animated.View>

          {/* Action buttons */}
          <Animated.View entering={FadeInDown.delay(100).duration(350)} style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.followBtn, following && { backgroundColor: C.bgCard, borderColor: C.border, borderWidth: 1 }]}
              activeOpacity={0.85}
              onPress={handleFollow}
            >
              {!following && (
                <LinearGradient colors={['#FF2D87', '#7B2FFF']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
              )}
              <Text style={[styles.followBtnText, { color: following ? C.textSecondary : '#FFFFFF' }]}>
                {following ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.msgBtn, { backgroundColor: C.bgCard, borderColor: C.border }]}
              activeOpacity={0.85}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/chat/${creator.id}` as any); }}
            >
              <Ionicons name="paper-plane-outline" size={16} color={C.textSecondary} />
              <Text style={[styles.msgBtnText, { color: C.textSecondary }]}>Message</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.moreBtn, { backgroundColor: C.bgCard, borderColor: C.border }]}
              activeOpacity={0.8}
            >
              <Ionicons name="ellipsis-horizontal" size={18} color={C.textSecondary} />
            </TouchableOpacity>
          </Animated.View>

          {/* Stats */}
          <Animated.View entering={FadeInDown.delay(140).duration(350)} style={[styles.statsRow, { borderColor: C.border }]}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: C.textPrimary }]}>{fmtNum(displayFollowers)}</Text>
              <Text style={[styles.statLabel, { color: C.textMuted }]}>Followers</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: C.border }]} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: C.textPrimary }]}>{fmtNum(displayFollowing)}</Text>
              <Text style={[styles.statLabel, { color: C.textMuted }]}>Following</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: C.border }]} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: C.textPrimary }]}>{realStats?.stream_count ?? creator.stream_count}</Text>
              <Text style={[styles.statLabel, { color: C.textMuted }]}>Streams</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: C.border }]} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: C.textPrimary }]}>{displayPosts}</Text>
              <Text style={[styles.statLabel, { color: C.textMuted }]}>Posts</Text>
            </View>
          </Animated.View>

          {/* Platform chips */}
          {platforms.length > 0 && (
            <Animated.View entering={FadeInDown.delay(180).duration(350)} style={styles.platformRow}>
              {platforms.map((p) => {
                try {
                  const plat = getPlatform(p as any);
                  const platHandle = platformUsernames[p] ?? creator.handle;
                  return (
                    <TouchableOpacity
                      key={p}
                      activeOpacity={0.75}
                      style={[styles.platChip, { backgroundColor: plat.gradient[0] + '18', borderColor: plat.gradient[0] + '44' }]}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openPlatform(p, platHandle); }}
                    >
                      <FontAwesome5 name={plat.icon} size={13} color={plat.gradient[0]} solid />
                      <View style={styles.platChipInfo}>
                        <Text style={[styles.platChipName, { color: plat.gradient[0] }]}>{plat.name}</Text>
                        <Text style={[styles.platChipHandle, { color: plat.gradient[0] + 'BB' }]}>@{platHandle}</Text>
                      </View>
                      <Ionicons name="arrow-forward" size={11} color={plat.gradient[0] + '88'} />
                    </TouchableOpacity>
                  );
                } catch { return null; }
              })}
            </Animated.View>
          )}
        </View>

        {/* ── Content tabs ── */}
        <Animated.View entering={FadeInDown.delay(220).duration(350)} style={[styles.tabRow, { borderColor: C.border }]}>
          {(['posts', 'streams'] as const).map((t) => {
            const active = contentTab === t;
            return (
              <TouchableOpacity
                key={t}
                style={styles.tabBtn}
                activeOpacity={0.75}
                onPress={() => { Haptics.selectionAsync(); setContentTab(t); }}
              >
                <Ionicons
                  name={t === 'posts' ? (active ? 'grid' : 'grid-outline') : (active ? 'radio' : 'radio-outline')}
                  size={18}
                  color={active ? C.textPrimary : C.textMuted}
                />
                <Text style={[styles.tabLabel, { color: active ? C.textPrimary : C.textMuted }]}>
                  {t === 'posts' ? 'Posts' : 'Streams'}
                </Text>
                {active && (
                  <LinearGradient
                    colors={['#FF2D87', '#7B2FFF']}
                    style={styles.tabUnderline}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </Animated.View>

        {/* ── Posts grid ── */}
        {contentTab === 'posts' ? (
          <Animated.View entering={FadeInDown.delay(260).duration(350)} style={styles.grid}>
            {userPosts.length > 0 ? userPosts.map((p) => (
              <TouchableOpacity key={p.id} activeOpacity={0.88}
                style={{ width: POST_CELL, height: POST_CELL_H, position: 'relative', overflow: 'hidden' }}
              >
                <View style={[StyleSheet.absoluteFill, { backgroundColor: '#111' }]} />
                {p.thumbnail_url
                  ? <Image source={{ uri: p.thumbnail_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  : <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                }
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end', padding: 6 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Ionicons name="play" size={10} color="rgba(255,255,255,0.9)" />
                    <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 10, color: '#FFFFFF' }}>0</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            )) : (
              <View style={{ width: '100%', alignItems: 'center', paddingVertical: 48, gap: 10 }}>
                <Ionicons name="grid-outline" size={36} color={C.textMuted} />
                <Text style={{ fontFamily: 'Syne-Bold', fontSize: 15, color: C.textPrimary }}>No posts yet</Text>
              </View>
            )}
          </Animated.View>
        ) : (
          <View style={[styles.emptyStreams, { borderColor: C.border }]}>
            <Ionicons name="radio-outline" size={36} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>No streams yet</Text>
            <Text style={[styles.emptySub, { color: C.textMuted }]}>
              {creator.display_name || creator.handle} hasn't gone live yet.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Floating back button */}
      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + 14 }]}
        activeOpacity={0.8}
        onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
      >
        <View style={styles.backBtnInner}>
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1 },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
    backBtnAbs: { position: 'absolute', top: 16, left: 16, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    // Cover
    coverWrap: { height: 160, position: 'relative' },
    cover: { ...StyleSheet.absoluteFillObject },
    liveOnCover: { position: 'absolute', top: 12, right: 16, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FF2D87', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 4 },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
    liveCoverText: { fontFamily: 'DMSans-Bold', fontSize: 12, color: '#FFFFFF', letterSpacing: 0.5 },
    // Avatar
    profileSection: { paddingHorizontal: 16, paddingBottom: 4 },
    avatarWrap: { marginTop: -38, marginBottom: 10, position: 'relative', alignSelf: 'flex-start' },
    avatar: { width: 80, height: 80, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.bg },
    avatarText: { fontFamily: 'Syne-ExtraBold', fontSize: 28, color: '#FFFFFF' },
    onlineDot: { position: 'absolute', bottom: 3, right: 3, width: 14, height: 14, borderRadius: 7, backgroundColor: '#00D4AA', borderWidth: 2.5 },
    // Name block
    nameBlock: { gap: 3, marginBottom: 14 },
    displayName: { fontFamily: 'Syne-Bold', fontSize: 22 },
    handle: { fontFamily: 'DMSans-Regular', fontSize: 13 },
    bio: { fontFamily: 'DMSans-Regular', fontSize: 13, lineHeight: 18, marginTop: 4 },
    // Actions
    actionRow: { flexDirection: 'row', gap: 8, marginBottom: 16, alignItems: 'center' },
    followBtn: { flex: 1, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    followBtnText: { fontFamily: 'DMSans-Bold', fontSize: 14 },
    msgBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1 },
    msgBtnText: { fontFamily: 'DMSans-Medium', fontSize: 13 },
    moreBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    // Stats
    statsRow: { flexDirection: 'row', borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 14 },
    stat: { flex: 1, alignItems: 'center', gap: 2 },
    statValue: { fontFamily: 'Syne-Bold', fontSize: 16 },
    statLabel: { fontFamily: 'DMSans-Regular', fontSize: 11 },
    statDivider: { width: 1, height: 28, alignSelf: 'center' },
    // Platforms
    platformRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
    platChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
    platChipInfo: { flexDirection: 'column', gap: 1 },
    platChipName: { fontFamily: 'DMSans-Bold', fontSize: 12 },
    platChipHandle: { fontFamily: 'DMSans-Regular', fontSize: 11 },
    // Tabs
    tabRow: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, marginTop: 12 },
    tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, position: 'relative' },
    tabLabel: { fontFamily: 'DMSans-Bold', fontSize: 13 },
    tabUnderline: { position: 'absolute', bottom: 0, left: '15%', right: '15%', height: 2.5, borderRadius: 2 },
    // Grid
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: POST_GAP, paddingTop: POST_GAP },
    // Empty
    emptyStreams: { alignItems: 'center', paddingVertical: 56, gap: 10, marginHorizontal: 16, marginTop: 16, borderRadius: 16, borderWidth: 1 },
    emptyTitle: { fontFamily: 'Syne-Bold', fontSize: 16 },
    emptySub: { fontFamily: 'DMSans-Regular', fontSize: 13, textAlign: 'center', maxWidth: 240, lineHeight: 20 },
    // Back button
    backBtn: { position: 'absolute', left: 12 },
    backBtnInner: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  });
}
