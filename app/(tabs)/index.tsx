import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
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
import { PLATFORMS } from '@/constants/platforms';
import { useApp } from '@/context/AppContext';
import { MIN_VIBA_TO_STREAM } from '@/context/AppContext';
import { fetchRecentStreams, fetchStreamStats, StreamSession } from '@/lib/streams';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/themes';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Pulsing live dot ─────────────────────────────────────────────────────────

function LiveDot() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.7);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.4, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1, false
    );
    opacity.value = withRepeat(
      withSequence(withTiming(1, { duration: 700 }), withTiming(0.4, { duration: 700 })),
      -1, false
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#00D97E' }, style]} />;
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StreamStatCard({
  label, value, color, delay, C,
}: {
  label: string; value: string; color: string; delay: number; C: AppColors;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(500)}
      style={[statCard.card, { backgroundColor: C.bgCard, borderColor: color + '30' }]}
    >
      <Text style={[statCard.value, { color }]}>{value}</Text>
      <Text style={[statCard.label, { color: C.textMuted }]}>{label}</Text>
    </Animated.View>
  );
}

const statCard = StyleSheet.create({
  card: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: 'center', gap: 2 },
  value: { fontFamily: 'Syne-Bold', fontSize: 22 },
  label: { fontFamily: 'DMSans-Regular', fontSize: 11 },
});

// ─── Platform pills ───────────────────────────────────────────────────────────

function PlatformStatusRow({ C }: { C: AppColors }) {
  const { platforms } = useApp();
  const connectedIds = platforms.filter((p) => p.connected).map((p) => p.id);

  return (
    <View style={platRow.row}>
      {PLATFORMS.map((p) => {
        const isOn = connectedIds.includes(p.id);
        return (
          <View
            key={p.id}
            style={[
              platRow.pill,
              isOn
                ? { backgroundColor: C.bgGlass, borderColor: C.borderBright }
                : { backgroundColor: 'transparent', borderColor: C.border, opacity: 0.5 },
            ]}
          >
            <FontAwesome5 name={p.icon} size={12} color={isOn ? C.textPrimary : C.textMuted} solid />
            <Text style={[platRow.name, { color: isOn ? C.textPrimary : C.textMuted }]}>{p.name}</Text>
            {isOn && <View style={[platRow.dot, { backgroundColor: C.success }]} />}
          </View>
        );
      })}
    </View>
  );
}

const platRow = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  name: { fontFamily: 'DMSans-Medium', fontSize: 12 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});

// ─── Recent stream card ───────────────────────────────────────────────────────

function RecentStreamCard({
  title, date, duration, viewers, gifts, C,
}: {
  title: string; date: string; duration: string; viewers: string; gifts: string; C: AppColors;
}) {
  return (
    <View style={[recentCard.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
      <View style={recentCard.top}>
        <View style={recentCard.titleRow}>
          <Ionicons name="recording-outline" size={14} color={C.pink} />
          <Text style={[recentCard.title, { color: C.textPrimary }]} numberOfLines={1}>{title}</Text>
        </View>
        <Text style={[recentCard.date, { color: C.textMuted }]}>{date}</Text>
      </View>
      <View style={recentCard.stats}>
        <View style={recentCard.stat}>
          <Ionicons name="time-outline" size={12} color={C.textMuted} />
          <Text style={[recentCard.statText, { color: C.textSecondary }]}>{duration}</Text>
        </View>
        <View style={recentCard.stat}>
          <Ionicons name="eye-outline" size={12} color={C.textMuted} />
          <Text style={[recentCard.statText, { color: C.textSecondary }]}>{viewers}</Text>
        </View>
        <View style={recentCard.stat}>
          <Ionicons name="gift-outline" size={12} color={C.gold} />
          <Text style={[recentCard.statText, { color: C.gold }]}>{gifts}</Text>
        </View>
      </View>
    </View>
  );
}

const recentCard = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  title: { fontFamily: 'DMSans-Medium', fontSize: 14, flex: 1 },
  date: { fontFamily: 'DMSans-Regular', fontSize: 12, marginLeft: 8 },
  stats: { flexDirection: 'row', gap: 16 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontFamily: 'DMSans-Regular', fontSize: 12 },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

function formatDuration(secs: number | null): string {
  if (!secs) return '—';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function timeAgoShort(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Style factory ────────────────────────────────────────────────────────────

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    content: { paddingHorizontal: 20, gap: 12 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    greeting: { fontFamily: 'DMSans-Regular', fontSize: 13, color: C.textMuted },
    username: { fontFamily: 'Syne-Bold', fontSize: 22, color: C.textPrimary, marginTop: 2 },
    notifBtn: {
      width: 42, height: 42, borderRadius: 12,
      backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border,
      alignItems: 'center', justifyContent: 'center',
    },
    notifBadge: {
      position: 'absolute', top: 6, right: 6, minWidth: 16, height: 16, borderRadius: 8,
      backgroundColor: C.pink, borderWidth: 1.5, borderColor: C.bg,
      alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
    },
    notifBadgeText: { fontFamily: 'DMSans-Bold', fontSize: 9, color: '#FFFFFF' },
    goLiveBanner: { borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
    bannerLeft: { flex: 1, gap: 4 },
    bannerLiveRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
    bannerReadyText: { fontFamily: 'DMSans-Medium', fontSize: 12, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: 1 },
    bannerTitle: { fontFamily: 'Syne-ExtraBold', fontSize: 22, color: '#FFFFFF' },
    bannerSub: { fontFamily: 'DMSans-Regular', fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
    bannerRight: { marginLeft: 16 },
    bannerBtn: { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 2 },
    sectionTitle: { fontFamily: 'Syne-Bold', fontSize: 16, color: C.textPrimary },
    sectionSub: { fontFamily: 'DMSans-Regular', fontSize: 12, color: C.textMuted },
    sectionAction: { fontFamily: 'DMSans-Medium', fontSize: 13, color: C.pink },
    statsRow: { flexDirection: 'row', gap: 10 },
    recentList: { gap: 10 },
    loadingRow: { paddingVertical: 20, alignItems: 'center' },
    emptyStreams: {
      backgroundColor: C.bgCard, borderRadius: 12, borderWidth: 1, borderColor: C.border,
      padding: 20, alignItems: 'center', gap: 8,
    },
    emptyStreamsText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 19 },
    tokenCard: {
      borderRadius: 16, borderWidth: 1, borderColor: C.purpleDim,
      padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden',
    },
    tokenLeft: { gap: 4, flex: 1 },
    tokenBadge: { alignSelf: 'flex-start', backgroundColor: C.purpleDim, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, marginBottom: 2 },
    tokenBadgeText: { fontFamily: 'Syne-Bold', fontSize: 10, color: C.viba, letterSpacing: 1 },
    tokenTitle: { fontFamily: 'Syne-Bold', fontSize: 15, color: C.textPrimary },
    tokenSub: { fontFamily: 'DMSans-Regular', fontSize: 12, color: C.textMuted },
    tokenRight: { alignItems: 'flex-end', gap: 2 },
    tokenAmount: { fontFamily: 'Syne-ExtraBold', fontSize: 26, color: C.viba },
    tokenAmountUnit: { fontFamily: 'DMSans-Medium', fontSize: 12, color: C.viba, opacity: 0.6, marginTop: -4 },
    tokenGain: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
    tokenGainText: { fontFamily: 'DMSans-Medium', fontSize: 11, color: C.success },
  });
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { profile, platforms, unreadCount, tokenBalance } = useApp();
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const connectedCount = platforms.filter((p) => p.connected).length;
  const canStream = tokenBalance >= MIN_VIBA_TO_STREAM;

  const [recentStreams, setRecentStreams] = useState<StreamSession[]>([]);
  const [stats, setStats] = useState({ totalStreams: 0, totalViewers: 0, totalEarnedUsd: 0 });
  const [loadingData, setLoadingData] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([fetchRecentStreams(3), fetchStreamStats()])
        .then(([streams, s]) => {
          if (!active) return;
          setRecentStreams(streams);
          setStats(s);
        })
        .catch(() => {})
        .finally(() => { if (active) setLoadingData(false); });
      return () => { active = false; };
    }, [])
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 110 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(0).duration(500)} style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.username}>{profile.handle}</Text>
        </View>
        <TouchableOpacity style={styles.notifBtn} activeOpacity={0.7} onPress={() => router.push('/notifications')}>
          <Ionicons name="notifications-outline" size={22} color={C.textSecondary} />
          {unreadCount > 0 && (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Go Live banner */}
      <Animated.View entering={FadeInDown.delay(100).duration(500)}>
        <TouchableOpacity activeOpacity={0.85} style={styles.goLiveBanner} onPress={() => router.push('/(tabs)/live')}>
          <LinearGradient colors={['#FF2D87', '#7B2FFF']} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <View style={styles.bannerLeft}>
            <View style={styles.bannerLiveRow}>
              <LiveDot />
              <Text style={styles.bannerReadyText}>Ready to go live</Text>
            </View>
            <Text style={styles.bannerTitle}>Start streaming now</Text>
            <Text style={styles.bannerSub}>{connectedCount} platform{connectedCount !== 1 ? 's' : ''} connected · earn $VIBA</Text>
          </View>
          <View style={styles.bannerRight}>
            <View style={styles.bannerBtn}>
              <Ionicons name="radio" size={20} color={C.pink} />
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Stats row */}
      <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>All time</Text>
        <Text style={styles.sectionSub}>across all platforms</Text>
      </Animated.View>
      <View style={styles.statsRow}>
        <StreamStatCard label="Viewers" value={stats.totalViewers >= 1000 ? `${(stats.totalViewers / 1000).toFixed(1)}K` : String(stats.totalViewers || '—')} color={C.pink} delay={250} C={C} />
        <StreamStatCard label="Gifts" value={stats.totalEarnedUsd > 0 ? `$${stats.totalEarnedUsd.toFixed(0)}` : '—'} color={C.gold} delay={300} C={C} />
        <StreamStatCard label="Streams" value={stats.totalStreams > 0 ? String(stats.totalStreams) : String(recentStreams.length)} color={C.purpleLight} delay={350} C={C} />
      </View>

      {/* Viba token card */}
      <Animated.View entering={FadeInDown.delay(370).duration(500)}>
        <View style={styles.tokenCard}>
          <LinearGradient colors={[C.purpleDim, C.pinkDim]} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <View style={styles.tokenLeft}>
            <View style={styles.tokenBadge}>
              <Text style={styles.tokenBadgeText}>$VIBA</Text>
            </View>
            <Text style={styles.tokenTitle}>Token earnings</Text>
            <Text style={styles.tokenSub}>Earned from streaming</Text>
          </View>
          <View style={styles.tokenRight}>
            <Text style={styles.tokenAmount}>{tokenBalance.toLocaleString()}</Text>
            <Text style={styles.tokenAmountUnit}>$VIBA</Text>
            <View style={styles.tokenGain}>
              <Ionicons name="trending-up" size={11} color={C.success} />
              <Text style={styles.tokenGainText}>earn while live</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Connected platforms */}
      <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Connected platforms</Text>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/(tabs)/profile')}>
          <Text style={styles.sectionAction}>Manage</Text>
        </TouchableOpacity>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(430).duration(500)}>
        <PlatformStatusRow C={C} />
      </Animated.View>

      {/* Recent streams */}
      <Animated.View entering={FadeInDown.delay(520).duration(500)} style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent streams</Text>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/streams')}>
          <Text style={styles.sectionAction}>See all</Text>
        </TouchableOpacity>
      </Animated.View>
      {loadingData ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={C.pink} size="small" />
        </View>
      ) : (
        <View style={styles.recentList}>
          {recentStreams.map((s, i) => (
            <Animated.View key={s.id} entering={FadeInDown.delay(560 + i * 40).duration(500)}>
              <RecentStreamCard
                title={s.title || 'Untitled stream'}
                date={timeAgoShort(s.started_at)}
                duration={formatDuration(s.duration_secs)}
                viewers={s.peak_viewers >= 1000 ? `${(s.peak_viewers / 1000).toFixed(1)}K` : String(s.peak_viewers)}
                gifts={`$${parseFloat(String(s.total_gifts_usd ?? 0)).toFixed(0)}`}
                C={C}
              />
            </Animated.View>
          ))}
          {recentStreams.length === 0 && (
            <View style={styles.emptyStreams}>
              <Ionicons name="recording-outline" size={28} color={C.textMuted} />
              <Text style={styles.emptyStreamsText}>No streams yet. Go live to see your history here.</Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}
