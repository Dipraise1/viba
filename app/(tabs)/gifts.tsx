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

const GIFT_COLORS = [
  ['#FF2D87', '#FF6BB3'],
  ['#7B2FFF', '#A855F7'],
  ['#FFB800', '#FFD460'],
  ['#00D97E', '#34EEA0'],
  ['#3B82F6', '#60A5FA'],
  ['#F97316', '#FDBA74'],
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

function GiftIconBadge({ index, size = 44 }: { index: number; size?: number }) {
  const colors = GIFT_COLORS[index % GIFT_COLORS.length] as [string, string];
  return (
    <LinearGradient
      colors={colors}
      style={[styles.giftIconBadge, { width: size, height: size, borderRadius: size * 0.35 }]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Ionicons name="gift" size={size * 0.46} color="#FFFFFF" />
    </LinearGradient>
  );
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
        <View>
          <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Gifts</Text>
          <Text style={[styles.headerSub, { color: C.textMuted }]}>Track what your viewers send</Text>
        </View>
        <TouchableOpacity style={[styles.exportBtn, { borderColor: C.border, backgroundColor: C.bgCard }]} activeOpacity={0.7}>
          <Ionicons name="download-outline" size={15} color={C.textSecondary} />
          <Text style={[styles.exportText, { color: C.textSecondary }]}>Export</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Period selector */}
      <Animated.View entering={FadeInDown.delay(60).duration(500)} style={styles.periodRow}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p.id}
            onPress={() => setPeriod(p.id)}
            activeOpacity={0.7}
            style={styles.periodPillWrap}
          >
            {period === p.id ? (
              <LinearGradient
                colors={['#FF2D87', '#7B2FFF']}
                style={styles.periodPillActive}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.periodTextActive}>{p.label}</Text>
              </LinearGradient>
            ) : (
              <View style={[styles.periodPill, { borderColor: C.border }]}>
                <Text style={[styles.periodText, { color: C.textMuted }]}>{p.label}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </Animated.View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={C.pink} size="large" />
        </View>
      ) : isEmpty ? (
        <Animated.View entering={FadeInDown.delay(120).duration(500)} style={[styles.emptyCard, { borderColor: C.border, backgroundColor: C.bgCard }]}>
          <LinearGradient
            colors={['rgba(255,45,135,0.08)', 'rgba(123,47,255,0.08)']}
            style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
          />
          <LinearGradient
            colors={['#FF2D87', '#7B2FFF']}
            style={styles.emptyIconCircle}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="gift" size={32} color="#FFFFFF" />
          </LinearGradient>
          <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>No gifts yet</Text>
          <Text style={[styles.emptySub, { color: C.textMuted }]}>Go live to start receiving gifts from your viewers</Text>
        </Animated.View>
      ) : (
        <>
          {/* Total earned card */}
          <Animated.View entering={FadeInDown.delay(120).duration(500)}>
            <View style={[styles.totalCard, { borderColor: C.border }]}>
              <LinearGradient
                colors={['rgba(255,45,135,0.14)', 'rgba(123,47,255,0.14)']}
                style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <View style={styles.totalTop}>
                <View>
                  <Text style={[styles.totalLabel, { color: C.textSecondary }]}>Total earned</Text>
                  <Text style={[styles.totalAmount, { color: C.textPrimary }]}>
                    {(analytics?.totalTokens ?? 0).toLocaleString()}
                    <Text style={[styles.totalUnit, { color: C.textMuted }]}> $VIBA</Text>
                  </Text>
                  <Text style={[styles.totalUsdSub, { color: C.textMuted }]}>
                    ≈ {formatUsd(analytics?.totalUsd ?? 0)} USD equivalent
                  </Text>
                </View>
                <LinearGradient
                  colors={['#FF2D87', '#7B2FFF']}
                  style={styles.totalIconBg}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="sparkles" size={22} color="#FFFFFF" />
                </LinearGradient>
              </View>

              <View style={[styles.totalDivider, { backgroundColor: C.border }]} />

              <View style={styles.totalMeta}>
                <View style={styles.totalMetaItem}>
                  <View style={[styles.metaIconBg, { backgroundColor: 'rgba(255,45,135,0.15)' }]}>
                    <Ionicons name="gift-outline" size={13} color="#FF2D87" />
                  </View>
                  <Text style={[styles.totalMetaText, { color: C.textMuted }]}>
                    {analytics?.totalCount ?? 0} gifts received
                  </Text>
                </View>
                <View style={styles.totalMetaItem}>
                  <View style={[styles.metaIconBg, { backgroundColor: 'rgba(123,47,255,0.15)' }]}>
                    <Ionicons name="layers-outline" size={13} color="#7B2FFF" />
                  </View>
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
                  const colors = GIFT_COLORS[index % GIFT_COLORS.length] as [string, string];
                  return (
                    <Animated.View
                      key={b.giftId}
                      entering={FadeInDown.delay(240 + index * 60).duration(400)}
                      style={[styles.breakdownCard, { borderColor: C.border, backgroundColor: C.bgCard }]}
                    >
                      <View style={styles.breakdownTop}>
                        <GiftIconBadge index={index} size={44} />
                        <View style={styles.breakdownMid}>
                          <Text style={[styles.breakdownName, { color: C.textPrimary }]}>{b.name}</Text>
                          <Text style={[styles.breakdownGifts, { color: C.textMuted }]}>{b.count} received</Text>
                        </View>
                        <Text style={[styles.breakdownAmount, { color: C.textPrimary }]}>
                          {b.tokens.toLocaleString()}
                          <Text style={[styles.breakdownUnit, { color: C.textMuted }]}> $V</Text>
                        </Text>
                      </View>
                      <View style={[styles.barTrack, { backgroundColor: C.border }]}>
                        <LinearGradient
                          colors={colors}
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
                <Text style={[styles.sectionTitle, { marginTop: 4, color: C.textPrimary }]}>Recent gifts</Text>
              </Animated.View>

              <View style={[styles.recentCard, { borderColor: C.border, backgroundColor: C.bgCard }]}>
                {recentGifts.map((g, index) => (
                  <Animated.View
                    key={g.id}
                    entering={FadeInDown.delay(520 + index * 50).duration(400)}
                    style={[
                      styles.giftRow,
                      { borderBottomColor: C.border },
                      index === recentGifts.length - 1 && { borderBottomWidth: 0 },
                    ]}
                  >
                    <GiftIconBadge index={index} size={38} />
                    <View style={styles.giftInfo}>
                      <Text style={[styles.giftName, { color: C.textPrimary }]}>
                        {g.quantity > 1 ? `${g.quantity}x ` : ''}{g.giftName}
                      </Text>
                      <Text style={[styles.giftFrom, { color: C.textMuted }]}>from {g.senderHandle}</Text>
                    </View>
                    <View style={styles.giftRight}>
                      <Text style={[styles.giftValue, { color: C.textPrimary }]}>
                        +{g.tokensSpent}
                        <Text style={[styles.giftValueUnit, { color: C.textMuted }]}> $V</Text>
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

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  headerTitle: { fontFamily: 'Syne-ExtraBold', fontSize: 30 },
  headerSub: { fontFamily: 'DMSans-Regular', fontSize: 13, marginTop: 2 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9 },
  exportText: { fontFamily: 'DMSans-Medium', fontSize: 13 },

  periodRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  periodPillWrap: {},
  periodPillActive: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  periodTextActive: { fontFamily: 'DMSans-Bold', fontSize: 13, color: '#FFFFFF' },
  periodPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  periodText: { fontFamily: 'DMSans-Medium', fontSize: 13 },

  loadingWrap: { paddingVertical: 60, alignItems: 'center' },

  emptyCard: { borderRadius: 20, borderWidth: 1, padding: 40, alignItems: 'center', gap: 12, overflow: 'hidden' },
  emptyIconCircle: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontFamily: 'Syne-Bold', fontSize: 18 },
  emptySub: { fontFamily: 'DMSans-Regular', fontSize: 14, textAlign: 'center', lineHeight: 21, maxWidth: 240 },

  totalCard: { borderRadius: 20, borderWidth: 1, padding: 22, overflow: 'hidden', gap: 16 },
  totalTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  totalLabel: { fontFamily: 'DMSans-Medium', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 },
  totalAmount: { fontFamily: 'Syne-ExtraBold', fontSize: 40, lineHeight: 46 },
  totalUnit: { fontSize: 15 },
  totalUsdSub: { fontFamily: 'DMSans-Regular', fontSize: 13, marginTop: 4 },
  totalIconBg: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  totalDivider: { height: 1 },
  totalMeta: { flexDirection: 'row', gap: 20 },
  totalMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaIconBg: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  totalMetaText: { fontFamily: 'DMSans-Regular', fontSize: 13 },

  sectionTitle: { fontFamily: 'Syne-Bold', fontSize: 17, marginTop: 4 },

  breakdownList: { gap: 10 },
  breakdownCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 12 },
  breakdownTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  breakdownMid: { flex: 1, gap: 3 },
  breakdownName: { fontFamily: 'DMSans-Bold', fontSize: 14 },
  breakdownGifts: { fontFamily: 'DMSans-Regular', fontSize: 12 },
  breakdownAmount: { fontFamily: 'Syne-Bold', fontSize: 16 },
  breakdownUnit: { fontSize: 11 },
  barTrack: { height: 5, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3 },

  recentCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  giftRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 14, borderBottomWidth: 1, gap: 12 },
  giftInfo: { flex: 1, gap: 3 },
  giftName: { fontFamily: 'DMSans-Bold', fontSize: 14 },
  giftFrom: { fontFamily: 'DMSans-Regular', fontSize: 12 },
  giftRight: { alignItems: 'flex-end', gap: 3 },
  giftValue: { fontFamily: 'Syne-Bold', fontSize: 15 },
  giftValueUnit: { fontSize: 11 },
  giftTime: { fontFamily: 'DMSans-Regular', fontSize: 11 },

  giftIconBadge: { alignItems: 'center', justifyContent: 'center' },
});
