import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import {
  fetchGiftAnalytics,
  fetchRecentGifts,
  GiftPeriod,
  GiftAnalytics,
  GiftEventRow,
} from '@/lib/gifts';

const PERIODS: { id: GiftPeriod; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'all', label: 'All time' },
];

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function formatUsd(usd: number): string {
  if (usd < 0.01) return '<$0.01';
  return `$${usd.toFixed(2)}`;
}

export default function GiftsScreen() {
  const insets = useSafeAreaInsets();
  const { colors: C } = useTheme();
  const [period, setPeriod] = useState<GiftPeriod>('week');
  const [userId, setUserId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<GiftAnalytics | null>(null);
  const [recentGifts, setRecentGifts] = useState<GiftEventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    Promise.all([
      fetchGiftAnalytics(userId, period),
      fetchRecentGifts(userId, 20),
    ]).then(([a, r]) => {
      setAnalytics(a);
      setRecentGifts(r);
      setLoading(false);
    });
  }, [userId, period]);

  const maxTokens = useMemo(
    () => Math.max(...(analytics?.breakdown.map((b) => b.tokens) ?? [1]), 1),
    [analytics]
  );

  const isEmpty = !loading && analytics?.totalCount === 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: C.bg }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(0).duration(500)} style={styles.header}>
        <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Gifts</Text>
        <TouchableOpacity style={[styles.exportBtn, { borderColor: C.border }]} activeOpacity={0.7}>
          <Ionicons name="download-outline" size={16} color={C.textSecondary} />
          <Text style={[styles.exportText, { color: C.textSecondary }]}>Export</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Period selector */}
      <Animated.View entering={FadeInDown.delay(60).duration(500)} style={styles.periodRow}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[
              styles.periodPill,
              { borderColor: C.border },
              period === p.id && { backgroundColor: C.bgCard, borderColor: C.textPrimary + '40' },
            ]}
            onPress={() => setPeriod(p.id)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.periodText,
              { color: C.textMuted },
              period === p.id && { color: C.textPrimary },
            ]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </Animated.View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={C.pink} size="large" />
        </View>
      ) : isEmpty ? (
        <Animated.View entering={FadeInDown.delay(120).duration(500)} style={[styles.emptyCard, { borderColor: C.border }]}>
          <Text style={styles.emptyEmoji}>🎁</Text>
          <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>No gifts yet</Text>
          <Text style={[styles.emptySub, { color: C.textMuted }]}>Go live to start receiving gifts from your viewers</Text>
        </Animated.View>
      ) : (
        <>
          {/* Total earned card */}
          <Animated.View entering={FadeInDown.delay(120).duration(500)}>
            <View style={[styles.totalCard, { borderColor: C.border }]}>
              <LinearGradient
                colors={['rgba(255,45,135,0.12)', 'rgba(123,47,255,0.12)']}
                style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <Text style={[styles.totalLabel, { color: C.textSecondary }]}>Total earned</Text>
              <Text style={[styles.totalAmount, { color: C.textPrimary }]}>
                {(analytics?.totalTokens ?? 0).toLocaleString()}
                <Text style={[styles.totalUnit, { color: C.textMuted }]}> $VIBA</Text>
              </Text>
              <Text style={[styles.totalUsdSub, { color: C.textMuted }]}>
                ≈ {formatUsd(analytics?.totalUsd ?? 0)} USD equivalent
              </Text>
              <View style={styles.totalMeta}>
                <View style={styles.totalMetaItem}>
                  <Ionicons name="gift-outline" size={14} color={C.textMuted} />
                  <Text style={[styles.totalMetaText, { color: C.textMuted }]}>
                    {analytics?.totalCount ?? 0} gifts received
                  </Text>
                </View>
                <View style={styles.totalMetaItem}>
                  <Ionicons name="layers-outline" size={14} color={C.textMuted} />
                  <Text style={[styles.totalMetaText, { color: C.textMuted }]}>
                    {analytics?.breakdown.length ?? 0} gift types
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Gift type breakdown */}
          {(analytics?.breakdown.length ?? 0) > 0 && (
            <>
              <Animated.View entering={FadeInDown.delay(200).duration(500)}>
                <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>By gift type</Text>
              </Animated.View>

              <View style={styles.breakdownList}>
                {analytics!.breakdown.map((b, index) => {
                  const pct = b.tokens / maxTokens;
                  return (
                    <Animated.View
                      key={b.giftId}
                      entering={FadeInDown.delay(240 + index * 60).duration(400)}
                      style={[styles.breakdownCard, { borderColor: C.border, backgroundColor: C.bgCard }]}
                    >
                      <View style={styles.breakdownTop}>
                        <Text style={styles.giftEmojiLg}>{b.emoji}</Text>
                        <Text style={[styles.breakdownName, { color: C.textPrimary }]}>{b.name}</Text>
                        <View style={{ flex: 1 }} />
                        <Text style={[styles.breakdownGifts, { color: C.textMuted }]}>{b.count}x</Text>
                        <Text style={[styles.breakdownAmount, { color: C.textPrimary }]}>
                          {b.tokens.toLocaleString()} <Text style={{ fontSize: 11, color: C.textMuted }}>$V</Text>
                        </Text>
                      </View>
                      <View style={[styles.barTrack, { backgroundColor: C.border }]}>
                        <LinearGradient
                          colors={['#FF2D87', '#7B2FFF']}
                          style={[styles.barFill, { width: `${Math.max(pct * 100, 4)}%` }]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        />
                      </View>
                    </Animated.View>
                  );
                })}
              </View>
            </>
          )}

          {/* Recent gifts */}
          {recentGifts.length > 0 && (
            <>
              <Animated.View entering={FadeInDown.delay(480).duration(500)}>
                <Text style={[styles.sectionTitle, { marginTop: 8, color: C.textPrimary }]}>Recent gifts</Text>
              </Animated.View>

              <View style={styles.recentList}>
                {recentGifts.map((g, index) => (
                  <Animated.View
                    key={g.id}
                    entering={FadeInDown.delay(520 + index * 50).duration(400)}
                    style={[styles.giftRow, { borderBottomColor: C.border }]}
                  >
                    <View style={styles.giftLeft}>
                      <Text style={styles.giftEmojiMd}>{g.giftEmoji}</Text>
                      <View style={styles.giftInfo}>
                        <Text style={[styles.giftName, { color: C.textPrimary }]}>
                          {g.quantity > 1 ? `${g.quantity}x ` : ''}{g.giftName}
                        </Text>
                        <Text style={[styles.giftFrom, { color: C.textMuted }]}>from {g.senderHandle}</Text>
                      </View>
                    </View>
                    <View style={styles.giftRight}>
                      <Text style={[styles.giftValue, { color: C.textPrimary }]}>
                        +{g.tokensSpent} <Text style={{ fontSize: 11, color: C.textMuted }}>$V</Text>
                      </Text>
                      <Text style={[styles.giftTime, { color: C.textMuted }]}>{timeAgo(g.createdAt)}</Text>
                    </View>
                  </Animated.View>
                ))}
              </View>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontFamily: 'Syne-ExtraBold', fontSize: 28 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  exportText: { fontFamily: 'DMSans-Medium', fontSize: 13 },
  periodRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  periodPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  periodText: { fontFamily: 'DMSans-Medium', fontSize: 13 },
  loadingWrap: { paddingVertical: 60, alignItems: 'center' },
  emptyCard: { borderRadius: 18, borderWidth: 1, padding: 32, alignItems: 'center', gap: 10 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontFamily: 'Syne-Bold', fontSize: 18 },
  emptySub: { fontFamily: 'DMSans-Regular', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  totalCard: { borderRadius: 18, borderWidth: 1, padding: 24, overflow: 'hidden', gap: 4 },
  totalLabel: { fontFamily: 'DMSans-Medium', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
  totalAmount: { fontFamily: 'Syne-ExtraBold', fontSize: 44, lineHeight: 48, marginTop: 4 },
  totalUnit: { fontSize: 16 },
  totalUsdSub: { fontFamily: 'DMSans-Regular', fontSize: 13, marginTop: 2 },
  totalMeta: { flexDirection: 'row', gap: 16, marginTop: 8 },
  totalMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  totalMetaText: { fontFamily: 'DMSans-Regular', fontSize: 13 },
  sectionTitle: { fontFamily: 'Syne-Bold', fontSize: 16 },
  breakdownList: { gap: 10 },
  breakdownCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  breakdownTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  giftEmojiLg: { fontSize: 26 },
  giftEmojiMd: { fontSize: 22 },
  breakdownName: { fontFamily: 'DMSans-Bold', fontSize: 14 },
  breakdownGifts: { fontFamily: 'DMSans-Regular', fontSize: 12, marginRight: 8 },
  breakdownAmount: { fontFamily: 'Syne-Bold', fontSize: 16 },
  barTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 2 },
  recentList: { gap: 0 },
  giftRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  giftLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  giftInfo: { gap: 2, flex: 1 },
  giftName: { fontFamily: 'DMSans-Bold', fontSize: 14 },
  giftFrom: { fontFamily: 'DMSans-Regular', fontSize: 12 },
  giftRight: { alignItems: 'flex-end', gap: 2 },
  giftValue: { fontFamily: 'Syne-Bold', fontSize: 15 },
  giftTime: { fontFamily: 'DMSans-Regular', fontSize: 11 },
});
