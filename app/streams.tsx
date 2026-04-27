import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { AppColors } from '@/constants/themes';
import { fetchRecentStreams, StreamSession } from '@/lib/streams';
import { PLATFORMS } from '@/constants/platforms';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(secs: number | null): string {
  if (!secs) return '—';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const PLATFORM_ICONS: Record<string, string> = {
  tiktok: 'tiktok',
  instagram: 'instagram',
  youtube: 'youtube',
  facebook: 'facebook',
  twitch: 'twitch',
};

// ─── Stream row ───────────────────────────────────────────────────────────────

function makeRowStyles(C: AppColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: C.bgCard,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.border,
      padding: 14,
      gap: 10,
      marginBottom: 10,
    },
    top: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flex: 1,
    },
    title: {
      fontFamily: 'DMSans-Medium',
      fontSize: 14,
      color: C.textPrimary,
      flex: 1,
    },
    date: {
      fontFamily: 'DMSans-Regular',
      fontSize: 12,
      color: C.textMuted,
      marginLeft: 8,
    },
    stats: {
      flexDirection: 'row',
      gap: 16,
    },
    stat: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    statText: {
      fontFamily: 'DMSans-Regular',
      fontSize: 12,
      color: C.textSecondary,
    },
    platforms: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    platformBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    platformName: {
      fontFamily: 'DMSans-Medium',
      fontSize: 11,
    },
  });
}

function StreamRow({ session, index, C }: { session: StreamSession; index: number; C: AppColors }) {
  const rowStyles = useMemo(() => makeRowStyles(C), [C]);
  const totalGifts = typeof session.total_gifts_usd === 'number'
    ? session.total_gifts_usd
    : parseFloat(session.total_gifts_usd as any ?? '0');

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(400)}>
      <View style={rowStyles.card}>
        <View style={rowStyles.top}>
          <View style={rowStyles.titleRow}>
            <Ionicons name="recording-outline" size={14} color={C.pink} />
            <Text style={rowStyles.title} numberOfLines={1}>
              {session.title || 'Untitled stream'}
            </Text>
          </View>
          <Text style={rowStyles.date}>{timeAgo(session.started_at)}</Text>
        </View>

        <View style={rowStyles.stats}>
          <View style={rowStyles.stat}>
            <Ionicons name="time-outline" size={12} color={C.textMuted} />
            <Text style={rowStyles.statText}>{formatDuration(session.duration_secs)}</Text>
          </View>
          <View style={rowStyles.stat}>
            <Ionicons name="eye-outline" size={12} color={C.textMuted} />
            <Text style={rowStyles.statText}>
              {session.peak_viewers >= 1000
                ? `${(session.peak_viewers / 1000).toFixed(1)}K`
                : session.peak_viewers}
            </Text>
          </View>
          {totalGifts > 0 && (
            <View style={rowStyles.stat}>
              <Ionicons name="gift-outline" size={12} color={C.gold} />
              <Text style={[rowStyles.statText, { color: C.gold }]}>${totalGifts}</Text>
            </View>
          )}
        </View>

        <View style={rowStyles.platforms}>
          {session.platform_ids.map((id) => {
            const p = PLATFORMS.find((p) => p.id === id);
            if (!p) return null;
            return (
              <View
                key={id}
                style={[rowStyles.platformBadge, { backgroundColor: (p.gradient[0] as string) + '25', borderColor: (p.gradient[0] as string) + '40' }]}
              >
                <FontAwesome5 name={PLATFORM_ICONS[id]} size={10} color={p.gradient[0] as string} solid />
                <Text style={[rowStyles.platformName, { color: p.gradient[0] as string }]}>{p.name}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Summary cards ─────────────────────────────────────────────────────────────

function makeSummaryStyles(C: AppColors) {
  return StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: C.bgCard,
      borderRadius: 14,
      borderWidth: 1,
      padding: 14,
      alignItems: 'center',
      gap: 4,
    },
    icon: { marginBottom: 2 },
    value: {
      fontFamily: 'Syne-Bold',
      fontSize: 18,
    },
    label: {
      fontFamily: 'DMSans-Regular',
      fontSize: 11,
      color: C.textMuted,
      textAlign: 'center',
    },
  });
}

function SummaryCard({ label, value, icon, color, C }: { label: string; value: string; icon: string; color: string; C: AppColors }) {
  const summaryStyles = useMemo(() => makeSummaryStyles(C), [C]);
  return (
    <View style={[summaryStyles.card, { borderColor: color + '30' }]}>
      <Ionicons name={icon as any} size={16} color={color} style={summaryStyles.icon} />
      <Text style={[summaryStyles.value, { color }]}>{value}</Text>
      <Text style={summaryStyles.label}>{label}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.bg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: C.bgCard,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontFamily: 'Syne-Bold',
      fontSize: 17,
      color: C.textPrimary,
    },
    loadingWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    list: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 40,
    },
    summaryRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 16,
    },
    empty: {
      alignItems: 'center',
      paddingTop: 80,
      gap: 12,
      paddingHorizontal: 40,
    },
    emptyTitle: {
      fontFamily: 'Syne-Bold',
      fontSize: 18,
      color: C.textSecondary,
    },
    emptySub: {
      fontFamily: 'DMSans-Regular',
      fontSize: 14,
      color: C.textMuted,
      textAlign: 'center',
      lineHeight: 21,
    },
  });
}

export default function StreamsScreen() {
  const insets = useSafeAreaInsets();
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [streams, setStreams] = useState<StreamSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentStreams(50)
      .then((data) => setStreams(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const completed = streams.filter((s) => s.ended_at !== null);
  const totalDuration = completed.reduce((sum, s) => sum + (s.duration_secs ?? 0), 0);
  const totalGifts = completed.reduce((sum, s) => sum + parseFloat(String(s.total_gifts_usd ?? 0)), 0);
  const totalViewers = completed.reduce((sum, s) => sum + (s.peak_viewers ?? 0), 0);

  const formatTotal = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Stream History</Text>
        <View style={{ width: 38 }} />
      </Animated.View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={C.pink} />
        </View>
      ) : (
        <FlatList
          data={streams}
          keyExtractor={(s) => s.id}
          renderItem={({ item, index }) => <StreamRow session={item} index={index} C={C} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            streams.length > 0 ? (
              <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.summaryRow}>
                <SummaryCard label="Total streams" value={String(completed.length)} icon="recording-outline" color={C.pink} C={C} />
                <SummaryCard label="Time live" value={formatTotal(totalDuration)} icon="time-outline" color={C.purpleLight} C={C} />
                <SummaryCard label="Gifts earned" value={`$${totalGifts.toFixed(0)}`} icon="gift-outline" color={C.gold} C={C} />
              </Animated.View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="recording-outline" size={48} color={C.textMuted} />
              <Text style={styles.emptyTitle}>No streams yet</Text>
              <Text style={styles.emptySub}>Your stream history will appear here after your first broadcast.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
