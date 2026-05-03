import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  FadeInDown,
} from 'react-native-reanimated';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/themes';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { getPlatform } from '@/constants/platforms';
import { getTrendingCreators, type TrendingCreator } from '@/lib/feed';

const { width: W } = Dimensions.get('window');
const CARD_GAP = 10;
const H_PAD = 16;
const CARD_W = (W - H_PAD * 2 - CARD_GAP) / 2;
const CARD_H = CARD_W * 1.38;

interface CreatorRow {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  stream_count: number;
  last_streamed_at: string | null;
  total_viewers: number;
  platforms: string[] | null;
  is_live: boolean;
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

function creatorGradient(id: string): [string, string, string] {
  return GRADIENT_POOL[id.charCodeAt(0) % GRADIENT_POOL.length];
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0] ?? '').join('').toUpperCase().slice(0, 2) || '??';
}

function timeAgo(iso: string | null) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function compactNumber(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

const CATEGORIES = ['All', 'Trending', 'Music', 'Gaming', 'Talk', 'Beauty', 'Fitness'];

function PulseDot({ size = 8, color = '#FF2D87' }: { size?: number; color?: string }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  React.useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.6, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1, false
    );
    opacity.value = withRepeat(
      withSequence(withTiming(0.3, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1, false
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[animStyle, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]} />
  );
}

function LiveCard({ creator, index }: { creator: CreatorRow; index: number }) {
  const grad = creatorGradient(creator.id);
  const viewers = creator.total_viewers ?? 0;
  const platforms = creator.platforms ?? [];

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(400)} style={{ width: CARD_W }}>
      <TouchableOpacity activeOpacity={0.88} style={liveCardS.card}>
        <LinearGradient colors={grad} style={liveCardS.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={liveCardS.lightSlash} />
          <View style={liveCardS.topRow}>
            <View style={liveCardS.liveBadge}>
              <PulseDot size={5} color="#FFFFFF" />
              <Text style={liveCardS.liveBadgeText}>LIVE</Text>
            </View>
            {viewers > 0 && (
              <View style={liveCardS.viewerPill}>
                <Ionicons name="eye" size={9} color="rgba(255,255,255,0.8)" />
                <Text style={liveCardS.viewerText}>
                  {viewers >= 1000 ? `${(viewers / 1000).toFixed(1)}K` : viewers}
                </Text>
              </View>
            )}
          </View>
          <View style={liveCardS.avatarWrap}>
            <View style={liveCardS.avatarRing}>
              <View style={liveCardS.avatar}>
                <Text style={liveCardS.avatarText}>{initials(creator.display_name || creator.handle)}</Text>
              </View>
            </View>
          </View>
          <View style={liveCardS.bottom}>
            <Text style={liveCardS.name} numberOfLines={1}>{creator.display_name || creator.handle}</Text>
            <Text style={liveCardS.handle} numberOfLines={1}>{creator.handle}</Text>
            {platforms.length > 0 && (
              <View style={liveCardS.platforms}>
                {platforms.slice(0, 3).map((p) => {
                  try {
                    const plat = getPlatform(p as any);
                    return (
                      <View key={p} style={[liveCardS.platDot, { backgroundColor: plat.gradient[0] + '40' }]}>
                        <FontAwesome5 name={plat.icon} size={7} color="#FFFFFF" solid />
                      </View>
                    );
                  } catch { return null; }
                })}
              </View>
            )}
          </View>
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.56)']}
            style={liveCardS.bottomFade}
            pointerEvents="none"
          />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const liveCardS = StyleSheet.create({
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    height: CARD_H,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 8,
  },
  gradient: { flex: 1, padding: 10 },
  lightSlash: {
    position: 'absolute',
    top: -24,
    left: -34,
    width: '88%',
    height: 70,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    transform: [{ rotate: '-18deg' }],
  },
  bottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '46%',
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,0,60,0.75)', borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  liveBadgeText: { fontFamily: 'DMSans-Bold', fontSize: 9, color: '#FFFFFF', letterSpacing: 0.5 },
  viewerPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 3,
  },
  viewerText: { fontFamily: 'DMSans-Bold', fontSize: 9, color: 'rgba(255,255,255,0.9)' },
  avatarWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatarRing: {
    width: 60, height: 60, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatar: {
    width: 52, height: 52, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: 'Syne-Bold', fontSize: 18, color: '#FFFFFF' },
  bottom: { gap: 2 },
  name: { fontFamily: 'DMSans-Bold', fontSize: 13, color: '#FFFFFF' },
  handle: { fontFamily: 'DMSans-Regular', fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  platforms: { flexDirection: 'row', gap: 4, marginTop: 3 },
  platDot: { width: 16, height: 16, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
});

function RecentRow({ creator, index }: { creator: CreatorRow; index: number }) {
  const { colors: C } = useTheme();
  const grad = creatorGradient(creator.id);

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(350)} style={recentS.row}>
      <LinearGradient colors={grad} style={recentS.avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={recentS.avatarText}>{initials(creator.display_name || creator.handle)}</Text>
      </LinearGradient>
      <View style={recentS.info}>
        <Text style={[recentS.name, { color: C.textPrimary }]} numberOfLines={1}>
          {creator.display_name || creator.handle}
        </Text>
        <View style={recentS.metaRow}>
          <Text style={[recentS.meta, { color: C.textMuted }]}>{timeAgo(creator.last_streamed_at)}</Text>
          {creator.stream_count > 0 && (
            <>
              <Text style={[recentS.dot, { color: C.textMuted }]}>·</Text>
              <Text style={[recentS.meta, { color: C.textMuted }]}>
                {creator.stream_count} stream{creator.stream_count !== 1 ? 's' : ''}
              </Text>
            </>
          )}
        </View>
      </View>
      {(creator.platforms ?? []).length > 0 && (
        <View style={recentS.platforms}>
          {(creator.platforms ?? []).slice(0, 3).map((p) => {
            try {
              const plat = getPlatform(p as any);
              return (
                <View key={p} style={[recentS.platDot, { backgroundColor: plat.gradient[0] + '22' }]}>
                  <FontAwesome5 name={plat.icon} size={8} color={plat.gradient[0]} solid />
                </View>
              );
            } catch { return null; }
          })}
        </View>
      )}
    </Animated.View>
  );
}

const recentS = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 14 },
  avatar: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontFamily: 'Syne-Bold', fontSize: 16, color: '#FFFFFF' },
  info: { flex: 1, gap: 3 },
  name: { fontFamily: 'DMSans-Bold', fontSize: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { fontFamily: 'DMSans-Regular', fontSize: 12 },
  dot: { fontFamily: 'DMSans-Regular', fontSize: 12 },
  platforms: { flexDirection: 'row', gap: 4 },
  platDot: { width: 20, height: 20, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
});

function NoLiveState({ C }: { C: AppColors }) {
  return (
    <View style={emptyS.wrap}>
      <LinearGradient
        colors={['rgba(255,45,135,0.1)', 'rgba(123,47,255,0.1)']}
        style={emptyS.icon}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name="radio-outline" size={32} color={C.pink} />
      </LinearGradient>
      <Text style={[emptyS.title, { color: C.textPrimary }]}>Nobody live yet</Text>
      <Text style={[emptyS.sub, { color: C.textMuted }]}>
        Be the first to go live — your stream will appear here for everyone.
      </Text>
      <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/(tabs)/live')} style={emptyS.btn}>
        <LinearGradient
          colors={['#FF2D87', '#7B2FFF']} style={emptyS.btnGrad}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        >
          <Ionicons name="radio" size={15} color="#FFFFFF" />
          <Text style={emptyS.btnText}>Go Live Now</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const emptyS = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 32, gap: 12 },
  icon: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Syne-Bold', fontSize: 18, textAlign: 'center' },
  sub: { fontFamily: 'DMSans-Regular', fontSize: 13, textAlign: 'center', lineHeight: 20, maxWidth: 260 },
  btn: { borderRadius: 12, overflow: 'hidden', marginTop: 4 },
  btnGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  btnText: { fontFamily: 'Syne-Bold', fontSize: 14, color: '#FFFFFF' },
});

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const [all, setAll] = useState<CreatorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');

  const liveCreators = all.filter((c) => c.is_live);
  const recentCreators = all.filter((c) => !c.is_live && c.stream_count > 0);
  const totalViewers = liveCreators.reduce((sum, c) => sum + (c.total_viewers ?? 0), 0);

  const load = useCallback(async () => {
    // Try trending_creators (algorithm-ranked); fall back to creator_discover
    const trending = await getTrendingCreators(user?.id, 50);
    if (trending.length) {
      setAll(trending as unknown as CreatorRow[]);
      return;
    }
    const { data, error } = await supabase
      .from('creator_discover')
      .select('*')
      .order('is_live', { ascending: false })
      .order('total_viewers', { ascending: false })
      .limit(50);
    if (!error && data) setAll(data.filter((c: CreatorRow) => c.id !== user?.id));
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const liveRows: CreatorRow[][] = [];
  for (let i = 0; i < liveCreators.length; i += 2) {
    liveRows.push(liveCreators.slice(i, i + 2));
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(0,212,170,0.08)', 'transparent', 'rgba(255,45,135,0.06)']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        pointerEvents="none"
      />
      <View style={styles.topAccent} pointerEvents="none" />
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <View style={styles.titleBlock}>
          <Text style={styles.pageTitle}>Discover</Text>
          <View style={styles.titleMeta}>
            <PulseDot size={6} color={liveCreators.length > 0 ? C.pink : C.textMuted} />
            <Text style={styles.titleMetaText}>
              {liveCreators.length > 0 ? `${liveCreators.length} live now` : 'Quiet right now'}
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.75} onPress={() => router.push('/search')}>
            <Ionicons name="search-outline" size={19} color={C.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.goLiveButton} activeOpacity={0.82} onPress={() => router.push('/(tabs)/live')}>
            <LinearGradient
              colors={['#FF2D87', '#7B2FFF']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Ionicons name="radio" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statPill}>
          <Ionicons name="radio-outline" size={14} color={C.pink} />
          <Text style={styles.statText}>{liveCreators.length} live</Text>
        </View>
        <View style={styles.statPill}>
          <Ionicons name="eye-outline" size={14} color="#00D4AA" />
          <Text style={styles.statText}>{compactNumber(totalViewers)} viewers</Text>
        </View>
        <View style={styles.statPill}>
          <Ionicons name="sparkles-outline" size={14} color={C.gold} />
          <Text style={styles.statText}>{all.length} creators</Text>
        </View>
      </View>

      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={styles.catScroll} contentContainerStyle={styles.catContent}
      >
        {CATEGORIES.map((cat) => {
          const active = cat === activeCategory;
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => { Haptics.selectionAsync(); setActiveCategory(cat); }}
              activeOpacity={0.75}
              style={[styles.catPill, active && styles.catPillActive]}
            >
              {active && (
                <LinearGradient
                  colors={['#FF2D87', '#7B2FFF']} style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                />
              )}
              <Text style={[styles.catText, active && styles.catTextActive]}>{cat}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingWrap}><ActivityIndicator color={C.pink} size="large" /></View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.pink} />}
        >
          {liveCreators.length === 0 ? (
            <NoLiveState C={C} />
          ) : (
            <>
              <View style={styles.sectionHeader}>
                <Ionicons name="radio-outline" size={15} color={C.pink} />
                <Text style={styles.sectionTitle}>Live Now</Text>
              </View>
              <View style={styles.grid}>
                {liveRows.map((row, ri) => (
                  <View key={ri} style={styles.gridRow}>
                    {row.map((creator, ci) => (
                      <LiveCard key={creator.id} creator={creator} index={ri * 2 + ci} />
                    ))}
                    {row.length === 1 && <View style={{ width: CARD_W }} />}
                  </View>
                ))}
              </View>
            </>
          )}

          {recentCreators.length > 0 && (
            <>
              <View style={[styles.sectionHeader, { marginTop: 8 }]}>
                <Ionicons name="time-outline" size={15} color={C.textMuted} />
                <Text style={styles.sectionTitle}>Recently Live</Text>
              </View>
              <View style={[styles.recentCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                {recentCreators.slice(0, 15).map((c, i) => (
                  <View key={c.id}>
                    <RecentRow creator={c} index={i} />
                    {i < Math.min(recentCreators.length, 15) - 1 && (
                      <View style={[styles.divider, { backgroundColor: C.border }]} />
                    )}
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg, overflow: 'hidden' },
    topAccent: {
      position: 'absolute',
      top: -52,
      right: -88,
      width: W * 0.88,
      height: 172,
      borderRadius: 34,
      backgroundColor: 'rgba(0,212,170,0.08)',
      transform: [{ rotate: '-15deg' }],
    },
    topBar: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: H_PAD, paddingBottom: 12,
    },
    titleBlock: { gap: 5 },
    pageTitle: { fontFamily: 'Syne-ExtraBold', fontSize: 26, color: C.textPrimary },
    titleMeta: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    titleMetaText: { fontFamily: 'DMSans-Medium', fontSize: 12, color: C.textMuted },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.bgCard,
      borderWidth: 1,
      borderColor: C.border,
    },
    goLiveButton: {
      width: 42,
      height: 42,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      shadowColor: C.pink,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.26,
      shadowRadius: 14,
      elevation: 7,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: H_PAD,
      paddingBottom: 13,
    },
    statPill: {
      flex: 1,
      minHeight: 34,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: C.bgCard,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 13,
      paddingHorizontal: 8,
    },
    statText: {
      fontFamily: 'DMSans-Bold',
      fontSize: 11,
      color: C.textSecondary,
    },
    catScroll: { flexGrow: 0 },
    catContent: { paddingHorizontal: H_PAD, gap: 8, paddingBottom: 12 },
    catPill: {
      borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7,
      backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, overflow: 'hidden',
    },
    catPillActive: { borderColor: 'transparent' },
    catText: { fontFamily: 'DMSans-Medium', fontSize: 13, color: C.textMuted },
    catTextActive: { color: '#FFFFFF', fontFamily: 'DMSans-Bold' },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: H_PAD, gap: 12 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 2 },
    sectionTitle: { fontFamily: 'Syne-Bold', fontSize: 16, color: C.textPrimary },
    grid: { gap: CARD_GAP },
    gridRow: { flexDirection: 'row', gap: CARD_GAP },
    recentCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
    divider: { height: 1, marginLeft: 72 },
  });
}
