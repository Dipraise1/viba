import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/themes';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.70;

// ─── Types ────────────────────────────────────────────────────────────────────

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

const PLATFORM_ICONS: Record<string, string> = {
  tiktok: 'tiktok',
  instagram: 'instagram',
  youtube: 'youtube',
  facebook: 'facebook',
  twitch: 'twitch',
};

const GRADIENT_POOL: readonly [string, string][] = [
  ['#FF2D87', '#7B2FFF'],
  ['#7B2FFF', '#06B6D4'],
  ['#FF6B35', '#FFB800'],
  ['#00D97E', '#06B6D4'],
  ['#EC4899', '#FF6B35'],
  ['#A855F7', '#7B2FFF'],
];

function creatorGradient(id: string): readonly [string, string] {
  const idx = id.charCodeAt(0) % GRADIENT_POOL.length;
  return GRADIENT_POOL[idx];
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({
  creator,
  size = 52,
}: {
  creator: CreatorRow;
  size?: number;
}) {
  const grad = creatorGradient(creator.id);
  return (
    <LinearGradient
      colors={grad as any}
      style={[
        avatarS.circle,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Text style={[avatarS.initials, { fontSize: size * 0.32 }]}>
        {initials(creator.display_name || creator.handle)}
      </Text>
    </LinearGradient>
  );
}

const avatarS = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: 'Syne-Bold', color: '#FFFFFF' },
});

// ─── Live card (carousel) ─────────────────────────────────────────────────────

function LiveCard({ creator }: { creator: CreatorRow }) {
  const scale = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const grad = creatorGradient(creator.id);
  const viewers = creator.total_viewers ?? 0;

  return (
    <Animated.View style={[liveCardS.wrap, aStyle]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={() => { scale.value = withSpring(0.97); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
      >
        <LinearGradient
          colors={[grad[0], grad[1], 'rgba(0,0,0,0.55)']}
          style={liveCardS.card}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={liveCardS.liveBadge}>
            <View style={liveCardS.liveDot} />
            <Text style={liveCardS.liveText}>LIVE</Text>
          </View>

          <View style={liveCardS.avatarBorder}>
            <Avatar creator={creator} size={62} />
          </View>

          <View style={liveCardS.info}>
            <Text style={liveCardS.name} numberOfLines={1}>
              {creator.display_name || creator.handle}
            </Text>
            <Text style={liveCardS.handle}>{creator.handle}</Text>
            <View style={liveCardS.metaRow}>
              {viewers > 0 && (
                <View style={liveCardS.viewerChip}>
                  <Ionicons name="eye-outline" size={11} color="rgba(255,255,255,0.8)" />
                  <Text style={liveCardS.viewerText}>
                    {viewers >= 1000 ? `${(viewers / 1000).toFixed(1)}K` : viewers}
                  </Text>
                </View>
              )}
            </View>
            {creator.platforms && creator.platforms.length > 0 && (
              <View style={liveCardS.platforms}>
                {creator.platforms.slice(0, 4).map((p) =>
                  PLATFORM_ICONS[p] ? (
                    <View key={p} style={liveCardS.platformIcon}>
                      <FontAwesome5
                        name={PLATFORM_ICONS[p]}
                        size={9}
                        color="rgba(255,255,255,0.75)"
                        solid
                      />
                    </View>
                  ) : null
                )}
              </View>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const liveCardS = StyleSheet.create({
  wrap: { width: CARD_WIDTH, marginRight: 12 },
  card: {
    borderRadius: 20,
    padding: 18,
    height: 196,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,45,135,0.88)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  liveDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#FFFFFF' },
  liveText: { fontFamily: 'Syne-Bold', fontSize: 10, color: '#FFFFFF', letterSpacing: 1 },
  avatarBorder: {
    alignSelf: 'flex-start',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: 36,
  },
  info: { gap: 3 },
  name: { fontFamily: 'Syne-Bold', fontSize: 16, color: '#FFFFFF' },
  handle: { fontFamily: 'DMSans-Regular', fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: -2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  viewerChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  viewerText: { fontFamily: 'DMSans-Medium', fontSize: 11, color: 'rgba(255,255,255,0.85)' },
  platforms: { flexDirection: 'row', gap: 5, marginTop: 3 },
  platformIcon: {
    width: 22, height: 22, borderRadius: 7,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
});

// ─── Creator row (recently live) ──────────────────────────────────────────────

function CreatorRow({ creator, index }: { creator: CreatorRow; index: number }) {
  const streamCount = creator.stream_count ?? 0;
  const grad = creatorGradient(creator.id);
  const { colors: C } = useTheme();
  const creatorRowS = useMemo(() => makeCreatorRowStyles(C), [C]);

  function timeAgo(d: string | null) {
    if (!d) return 'Never streamed';
    const diff = Date.now() - new Date(d).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return 'Streamed just now';
    if (h < 24) return `Streamed ${h}h ago`;
    const days = Math.floor(h / 24);
    if (days === 1) return 'Streamed yesterday';
    return `Streamed ${days}d ago`;
  }

  return (
    <Animated.View entering={FadeInDown.delay(index * 55).duration(380)}>
      <TouchableOpacity
        style={creatorRowS.row}
        activeOpacity={0.72}
        onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
      >
        <Avatar creator={creator} size={44} />
        <View style={creatorRowS.info}>
          <Text style={creatorRowS.name} numberOfLines={1}>
            {creator.display_name || creator.handle}
          </Text>
          <Text style={creatorRowS.sub}>{timeAgo(creator.last_streamed_at)}</Text>
        </View>
        <View style={creatorRowS.right}>
          <Text style={creatorRowS.streams}>{streamCount}</Text>
          <Text style={creatorRowS.streamsLabel}>stream{streamCount !== 1 ? 's' : ''}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function makeCreatorRowStyles(C: AppColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
    info: { flex: 1, gap: 2 },
    name: { fontFamily: 'DMSans-Bold', fontSize: 14, color: C.textPrimary },
    sub: { fontFamily: 'DMSans-Regular', fontSize: 12, color: C.textMuted },
    right: { alignItems: 'flex-end', gap: 1 },
    streams: { fontFamily: 'Syne-Bold', fontSize: 15, color: C.textPrimary },
    streamsLabel: { fontFamily: 'DMSans-Regular', fontSize: 10, color: C.textMuted },
  });
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyDiscover() {
  const { colors: C } = useTheme();
  return (
    <Animated.View entering={FadeInDown.delay(200).duration(400)} style={{ paddingTop: 16 }}>
      <LinearGradient
        colors={[C.purpleDim, C.pinkDim]}
        style={[{ borderRadius: 20, borderWidth: 1, borderColor: C.borderPurple, padding: 28, alignItems: 'center' as const, gap: 12 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={{ width: 68, height: 68, borderRadius: 22, backgroundColor: C.purpleDim, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
          <Ionicons name="compass-outline" size={36} color={C.purpleLight} />
        </View>
        <Text style={{ fontFamily: 'Syne-Bold', fontSize: 18, color: C.textPrimary, textAlign: 'center' }}>Be the first to stream</Text>
        <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 20 }}>
          The discover feed shows creators who have gone live on Viba. Start your first stream and appear here.
        </Text>
      </LinearGradient>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeDiscoverStyles(C), [C]);

  const [all, setAll] = useState<CreatorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const live = all.filter((c) => c.is_live);
  const recent = all.filter((c) => !c.is_live && c.stream_count > 0);

  const searchResults = search.trim()
    ? all.filter(
        (c) =>
          c.display_name.toLowerCase().includes(search.toLowerCase()) ||
          c.handle.toLowerCase().includes(search.toLowerCase())
      )
    : null;

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('creator_discover')
      .select('*')
      .order('is_live', { ascending: false })
      .order('last_streamed_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      // Exclude current user from discover
      setAll(data.filter((c: CreatorRow) => c.id !== user?.id));
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const isEmpty = !loading && all.length === 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: 110 },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={C.pink}
        />
      }
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(0).duration(400)} style={styles.header}>
        <Text style={styles.title}>Discover</Text>
        <Text style={styles.sub}>Creators streaming on Viba</Text>
      </Animated.View>

      {/* Search */}
      <Animated.View entering={FadeInDown.delay(70).duration(400)}>
        <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
          <Ionicons
            name="search-outline"
            size={17}
            color={searchFocused ? C.pink : C.textMuted}
          />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search creators…"
            placeholderTextColor={C.textMuted}
            style={styles.searchInput}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={16} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Loading */}
      {loading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={C.pink} />
        </View>
      )}

      {/* Search results */}
      {!loading && searchResults !== null && (
        <Animated.View entering={FadeInDown.duration(280)} style={styles.section}>
          <Text style={styles.sectionSub}>
            {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{search}"
          </Text>
          {searchResults.length > 0 ? (
            <View style={styles.card}>
              {searchResults.map((c, i) => (
                <CreatorRow key={c.id} creator={c} index={i} />
              ))}
            </View>
          ) : (
            <View style={styles.noResults}>
              <Ionicons name="search-outline" size={28} color={C.textMuted} />
              <Text style={styles.noResultsText}>No creators found</Text>
            </View>
          )}
        </Animated.View>
      )}

      {/* Main feed (no search active) */}
      {!loading && searchResults === null && (
        <>
          {/* Empty state */}
          {isEmpty && <EmptyDiscover />}

          {/* Live now */}
          {live.length > 0 && (
            <>
              <Animated.View
                entering={FadeInDown.delay(140).duration(400)}
                style={styles.sectionHeader}
              >
                <View style={styles.sectionLeft}>
                  <View style={styles.liveIndicator} />
                  <Text style={styles.sectionTitle}>Live Now</Text>
                </View>
                <Text style={styles.sectionCount}>{live.length} streaming</Text>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(180).duration(400)}>
                <FlatList
                  horizontal
                  data={live}
                  keyExtractor={(c) => c.id}
                  renderItem={({ item }) => <LiveCard creator={item} />}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.carousel}
                  scrollEnabled
                />
              </Animated.View>
            </>
          )}

          {/* Recently live */}
          {recent.length > 0 && (
            <>
              <Animated.View
                entering={FadeInDown.delay(240).duration(400)}
                style={styles.sectionHeader}
              >
                <View style={styles.sectionLeft}>
                  <Ionicons name="time-outline" size={15} color={C.textMuted} />
                  <Text style={styles.sectionTitle}>Recently Live</Text>
                </View>
              </Animated.View>

              <Animated.View
                entering={FadeInDown.delay(280).duration(400)}
                style={styles.card}
              >
                {recent.slice(0, 20).map((c, i) => (
                  <CreatorRow key={c.id} creator={c} index={i} />
                ))}
              </Animated.View>
            </>
          )}

          {/* Invite CTA */}
          {!isEmpty && (
            <Animated.View entering={FadeInDown.delay(360).duration(400)}>
              <TouchableOpacity
                activeOpacity={0.84}
                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
              >
                <LinearGradient
                  colors={['rgba(123,47,255,0.18)', 'rgba(255,45,135,0.12)']}
                  style={styles.ctaCard}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.ctaIcon}>
                    <Ionicons name="person-add-outline" size={20} color={C.pink} />
                  </View>
                  <View style={styles.ctaText}>
                    <Text style={styles.ctaTitle}>Invite a creator</Text>
                    <Text style={styles.ctaSub}>
                      Share Viba — they earn 100 $VIBA on signup
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={17} color={C.textMuted} />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}
        </>
      )}
    </ScrollView>
  );
}

function makeDiscoverStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    content: { paddingHorizontal: 20, gap: 14 },
    header: { gap: 2, marginBottom: 2 },
    title: { fontFamily: 'Syne-ExtraBold', fontSize: 26, color: C.textPrimary },
    sub: { fontFamily: 'DMSans-Regular', fontSize: 13, color: C.textMuted },
    searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.bgCard, borderRadius: 14, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 12 },
    searchBarFocused: { borderColor: C.pink, backgroundColor: C.pinkDim },
    searchInput: { flex: 1, fontFamily: 'DMSans-Regular', fontSize: 15, color: C.textPrimary },
    loadingWrap: { paddingVertical: 40, alignItems: 'center' },
    section: { gap: 10 },
    sectionSub: { fontFamily: 'DMSans-Regular', fontSize: 13, color: C.textMuted, marginBottom: 2 },
    noResults: { alignItems: 'center', paddingVertical: 36, gap: 10 },
    noResultsText: { fontFamily: 'DMSans-Regular', fontSize: 14, color: C.textMuted },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: -2 },
    sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    sectionTitle: { fontFamily: 'Syne-Bold', fontSize: 16, color: C.textPrimary },
    sectionCount: { fontFamily: 'DMSans-Regular', fontSize: 12, color: C.textMuted },
    liveIndicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.pink },
    carousel: { paddingRight: 20, marginLeft: -20, paddingLeft: 20 },
    card: { backgroundColor: C.bgCard, borderRadius: 16, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 4 },
    ctaCard: { borderRadius: 16, borderWidth: 1, borderColor: C.borderPurple, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 },
    ctaIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: C.pinkDim, alignItems: 'center', justifyContent: 'center' },
    ctaText: { flex: 1, gap: 2 },
    ctaTitle: { fontFamily: 'DMSans-Bold', fontSize: 14, color: C.textPrimary },
    ctaSub: { fontFamily: 'DMSans-Regular', fontSize: 12, color: C.textMuted, lineHeight: 17 },
  });
}
