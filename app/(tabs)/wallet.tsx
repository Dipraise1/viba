import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp, TokenTransaction, MIN_VIBA_TO_STREAM, VIBA_EARN_RATE } from '@/context/AppContext';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/themes';

const { width } = Dimensions.get('window');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function dateKey(date: Date): string {
  const now = new Date();
  const d = new Date(date);
  if (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  )
    return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  )
    return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function txIcon(tx: TokenTransaction, C: AppColors): { name: string; bg: string; color: string } {
  if (tx.type === 'buy') return { name: 'add-circle-outline', bg: C.vibaDim, color: C.viba };
  if (tx.type === 'spend') return { name: 'arrow-up-outline', bg: C.pinkDim, color: C.pink };
  if (tx.label.toLowerCase().includes('gift')) return { name: 'gift-outline', bg: C.goldDim, color: C.gold };
  return { name: 'radio-outline', bg: C.successDim, color: C.success };
}

// ─── Balance card ─────────────────────────────────────────────────────────────

function BalanceCard({
  balance,
  earnedToday,
  canStream,
}: {
  balance: number;
  earnedToday: number;
  canStream: boolean;
}) {
  const { colors: C } = useTheme();
  const card = useMemo(() => makeCardStyles(C), [C]);
  return (
    <Animated.View entering={FadeInDown.delay(60).duration(500)}>
      <LinearGradient
        colors={['#3D1880', '#1A0A3A', '#110620']}
        style={card.wrap}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Background accent glow */}
        <View style={card.glowTop} />
        <View style={card.glowBottom} />

        {/* Top row */}
        <View style={card.topRow}>
          <View style={card.tokenBadge}>
            <Text style={card.tokenBadgeText}>$VIBA</Text>
          </View>
          <View style={[card.statusPill, canStream ? card.statusOk : card.statusWarn]}>
            <View style={[card.statusDot, { backgroundColor: canStream ? C.success : C.gold }]} />
            <Text style={[card.statusText, { color: canStream ? C.success : C.gold }]}>
              {canStream ? 'Ready to go live' : `Need ${MIN_VIBA_TO_STREAM} to stream`}
            </Text>
          </View>
        </View>

        {/* Balance */}
        <View style={card.balanceRow}>
          <Text style={card.balance}>{balance.toLocaleString()}</Text>
          <Text style={card.balanceUnit}>tokens</Text>
        </View>

        {/* Bottom row */}
        <View style={card.bottomRow}>
          <View style={card.earnRate}>
            <Ionicons name="flash" size={12} color={C.viba} />
            <Text style={card.earnRateText}>+{VIBA_EARN_RATE}/sec while live</Text>
          </View>
          {earnedToday > 0 && (
            <View style={card.todayBadge}>
              <Ionicons name="trending-up" size={11} color={C.success} />
              <Text style={card.todayText}>+{earnedToday} today</Text>
            </View>
          )}
        </View>

        {/* Subtle grid lines */}
        <View style={[card.gridLine, { top: '40%', opacity: 0.06 }]} />
        <View style={[card.gridLine, { top: '70%', opacity: 0.04 }]} />
      </LinearGradient>
    </Animated.View>
  );
}

function makeCardStyles(C: AppColors) {
  return StyleSheet.create({
    wrap: { borderRadius: 22, padding: 22, borderWidth: 1, borderColor: 'rgba(168,85,247,0.25)', overflow: 'hidden', gap: 16 },
    glowTop: { position: 'absolute', top: -40, left: -20, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(123,47,255,0.32)' },
    glowBottom: { position: 'absolute', bottom: -60, right: -30, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,45,135,0.22)' },
    gridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#FFFFFF' },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    tokenBadge: { backgroundColor: 'rgba(168,85,247,0.2)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(168,85,247,0.35)', paddingHorizontal: 10, paddingVertical: 4 },
    tokenBadgeText: { fontFamily: 'Syne-Bold', fontSize: 12, color: C.viba, letterSpacing: 1 },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
    statusOk: { backgroundColor: 'rgba(0,217,126,0.1)', borderColor: 'rgba(0,217,126,0.2)' },
    statusWarn: { backgroundColor: 'rgba(255,184,0,0.1)', borderColor: 'rgba(255,184,0,0.2)' },
    statusDot: { width: 5, height: 5, borderRadius: 3 },
    statusText: { fontFamily: 'DMSans-Medium', fontSize: 11 },
    balanceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
    balance: { fontFamily: 'Syne-ExtraBold', fontSize: 52, color: '#FFFFFF', lineHeight: 54, letterSpacing: -1 },
    balanceUnit: { fontFamily: 'DMSans-Regular', fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 8 },
    bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: -4 },
    earnRate: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    earnRateText: { fontFamily: 'DMSans-Regular', fontSize: 12, color: 'rgba(168,85,247,0.8)' },
    todayBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.successDim, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(0,217,126,0.2)' },
    todayText: { fontFamily: 'DMSans-Bold', fontSize: 12, color: C.success },
  });
}

// ─── Action button ─────────────────────────────────────────────────────────────

function ActionBtn({
  icon,
  label,
  onPress,
  primary,
  soon,
  delay,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  primary?: boolean;
  soon?: boolean;
  delay?: number;
}) {
  const { colors: C } = useTheme();
  const actionS = useMemo(() => makeActionStyles(C), [C]);
  const scale = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    scale.value = withSpring(0.9, { damping: 14 }, () => {
      scale.value = withSpring(1, { damping: 10 });
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Animated.View style={[actionS.wrap, aStyle]} entering={FadeInUp.delay(delay ?? 0).duration(400)}>
      <Pressable onPress={handlePress} style={actionS.btn}>
        {primary ? (
          <LinearGradient
            colors={['#FF2D87', '#9B30FF']}
            style={actionS.iconCircle}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name={icon as any} size={20} color="#FFFFFF" />
          </LinearGradient>
        ) : (
          <View style={actionS.iconCircleOutline}>
            <Ionicons name={icon as any} size={20} color={C.textSecondary} />
          </View>
        )}
        <Text style={[actionS.label, primary && actionS.labelPrimary]}>{label}</Text>
        {soon && (
          <View style={actionS.soonBadge}>
            <Text style={actionS.soonText}>Soon</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

function makeActionStyles(C: AppColors) {
  return StyleSheet.create({
    wrap: {},
    btn: { alignItems: 'center', gap: 7 },
    iconCircle: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    iconCircleOutline: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border },
    label: { fontFamily: 'DMSans-Medium', fontSize: 12, color: C.textMuted },
    labelPrimary: { color: C.textPrimary },
    soonBadge: { backgroundColor: C.pinkDim, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1, marginTop: -4 },
    soonText: { fontFamily: 'DMSans-Bold', fontSize: 9, color: C.pink },
  });
}

// ─── Earnings this week mini-chart ────────────────────────────────────────────

function WeeklyChart({ transactions }: { transactions: TokenTransaction[] }) {
  const { colors: C } = useTheme();
  const chartS = useMemo(() => makeChartStyles(C), [C]);
  // Build 7-day daily earn totals
  const days = useMemo(() => {
    const result: { label: string; amount: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const dayEnd = dayStart + 86400000;
      const amount = transactions
        .filter(
          (tx) =>
            (tx.type === 'earn' || tx.type === 'buy') &&
            tx.timestamp.getTime() >= dayStart &&
            tx.timestamp.getTime() < dayEnd
        )
        .reduce((s, tx) => s + tx.amount, 0);
      result.push({ label, amount });
    }
    return result;
  }, [transactions]);

  const maxVal = Math.max(...days.map((d) => d.amount), 1);
  const weekTotal = days.reduce((s, d) => s + d.amount, 0);

  return (
    <Animated.View entering={FadeInDown.delay(200).duration(400)} style={chartS.wrap}>
      <View style={chartS.header}>
        <View>
          <Text style={chartS.title}>This week</Text>
          <Text style={chartS.sub}>Token earnings</Text>
        </View>
        <View style={chartS.total}>
          <Text style={chartS.totalNum}>{weekTotal.toLocaleString()}</Text>
          <Text style={chartS.totalUnit}>$VIBA</Text>
        </View>
      </View>

      <View style={chartS.bars}>
        {days.map((day, i) => {
          const pct = day.amount / maxVal;
          const isToday = i === 6;
          return (
            <View key={i} style={chartS.barCol}>
              <View style={chartS.barTrack}>
                <Animated.View
                  entering={FadeInUp.delay(220 + i * 40).duration(400)}
                  style={[
                    chartS.barFill,
                    {
                      height: `${Math.max(pct * 100, day.amount > 0 ? 8 : 3)}%`,
                    },
                  ]}
                >
                  <LinearGradient
                    colors={isToday ? ['#FF2D87', '#7B2FFF'] : ['rgba(168,85,247,0.6)', 'rgba(123,47,255,0.4)']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                  />
                </Animated.View>
              </View>
              <Text style={[chartS.dayLabel, isToday && chartS.dayLabelActive]}>
                {day.label.slice(0, 3)}
              </Text>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
}

function makeChartStyles(C: AppColors) {
  return StyleSheet.create({
    wrap: { backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 18, gap: 18 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    title: { fontFamily: 'Syne-Bold', fontSize: 15, color: C.textPrimary },
    sub: { fontFamily: 'DMSans-Regular', fontSize: 12, color: C.textMuted, marginTop: 2 },
    total: { alignItems: 'flex-end' },
    totalNum: { fontFamily: 'Syne-ExtraBold', fontSize: 22, color: C.viba },
    totalUnit: { fontFamily: 'DMSans-Regular', fontSize: 11, color: C.textMuted, marginTop: -2 },
    bars: { flexDirection: 'row', gap: 6, height: 72, alignItems: 'flex-end' },
    barCol: { flex: 1, alignItems: 'center', gap: 5, height: '100%' },
    barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end', borderRadius: 6, overflow: 'hidden', backgroundColor: C.border },
    barFill: { width: '100%', borderRadius: 6, overflow: 'hidden', minHeight: 4 },
    dayLabel: { fontFamily: 'DMSans-Regular', fontSize: 10, color: C.textMuted },
    dayLabelActive: { color: C.pink, fontFamily: 'DMSans-Bold' },
  });
}

// ─── Stats strip ──────────────────────────────────────────────────────────────

function StatStrip({
  transactions,
  balance,
}: {
  transactions: TokenTransaction[];
  balance: number;
}) {
  const { colors: C } = useTheme();
  const strip = useMemo(() => makeStripStyles(C), [C]);
  const totalEarned = transactions
    .filter((tx) => tx.type === 'earn' || tx.type === 'buy')
    .reduce((s, tx) => s + tx.amount, 0);
  const totalSpent = transactions
    .filter((tx) => tx.type === 'spend')
    .reduce((s, tx) => s + Math.abs(tx.amount), 0);
  const streamCount = new Set(
    transactions
      .filter((tx) => tx.type === 'earn' && tx.label.toLowerCase().includes('stream'))
      .map((tx) => tx.timestamp.toDateString())
  ).size;

  return (
    <Animated.View entering={FadeInDown.delay(240).duration(400)} style={strip.row}>
      <View style={strip.cell}>
        <Text style={strip.value}>{totalEarned.toLocaleString()}</Text>
        <Text style={strip.label}>Total earned</Text>
      </View>
      <View style={strip.divider} />
      <View style={strip.cell}>
        <Text style={strip.value}>{totalSpent.toLocaleString()}</Text>
        <Text style={strip.label}>Total spent</Text>
      </View>
      <View style={strip.divider} />
      <View style={strip.cell}>
        <Text style={strip.value}>{balance.toLocaleString()}</Text>
        <Text style={strip.label}>Available</Text>
      </View>
    </Animated.View>
  );
}

function makeStripStyles(C: AppColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', backgroundColor: C.bgCard, borderRadius: 16, borderWidth: 1, borderColor: C.border, paddingVertical: 16 },
    cell: { flex: 1, alignItems: 'center', gap: 4 },
    divider: { width: 1, backgroundColor: C.border },
    value: { fontFamily: 'Syne-Bold', fontSize: 18, color: C.textPrimary },
    label: { fontFamily: 'DMSans-Regular', fontSize: 11, color: C.textMuted },
  });
}

// ─── Quick links ──────────────────────────────────────────────────────────────

function QuickLinks() {
  const { colors: C } = useTheme();
  const ql = useMemo(() => makeQlStyles(C), [C]);
  return (
    <Animated.View entering={FadeInDown.delay(280).duration(400)} style={ql.row}>
      <TouchableOpacity
        style={ql.card}
        activeOpacity={0.8}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/gift-analytics'); }}
      >
        <LinearGradient
          colors={['rgba(255,184,0,0.15)', 'rgba(255,184,0,0.05)']}
          style={ql.grad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={ql.iconWrap}>
            <Ionicons name="gift-outline" size={20} color={C.gold} />
          </View>
          <Text style={ql.cardTitle}>Gift Analytics</Text>
          <Text style={ql.cardSub}>Platform breakdown</Text>
          <View style={ql.arrow}>
            <Ionicons name="arrow-forward" size={14} color={C.gold} />
          </View>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        style={ql.card}
        activeOpacity={0.8}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/streams'); }}
      >
        <LinearGradient
          colors={['rgba(255,45,135,0.15)', 'rgba(255,45,135,0.05)']}
          style={ql.grad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={[ql.iconWrap, { backgroundColor: C.pinkDim }]}>
            <Ionicons name="recording-outline" size={20} color={C.pink} />
          </View>
          <Text style={ql.cardTitle}>Stream History</Text>
          <Text style={ql.cardSub}>All broadcasts</Text>
          <View style={[ql.arrow, { backgroundColor: C.pinkDim }]}>
            <Ionicons name="arrow-forward" size={14} color={C.pink} />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

function makeQlStyles(C: AppColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', gap: 10 },
    card: { flex: 1, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
    grad: { padding: 16, gap: 6, minHeight: 130 },
    iconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.goldDim, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    cardTitle: { fontFamily: 'Syne-Bold', fontSize: 14, color: C.textPrimary },
    cardSub: { fontFamily: 'DMSans-Regular', fontSize: 12, color: C.textMuted },
    arrow: { width: 28, height: 28, borderRadius: 9, backgroundColor: C.goldDim, alignItems: 'center', justifyContent: 'center', marginTop: 'auto' as any, alignSelf: 'flex-end' },
  });
}

// ─── Transaction item ─────────────────────────────────────────────────────────

function TxItem({ tx, last }: { tx: TokenTransaction; last: boolean }) {
  const { colors: C } = useTheme();
  const txS = useMemo(() => makeTxStyles(C), [C]);
  const { name, bg, color } = txIcon(tx, C);
  const isEarn = tx.type === 'earn' || tx.type === 'buy';

  return (
    <View style={[txS.row, last && txS.rowLast]}>
      <View style={[txS.icon, { backgroundColor: bg }]}>
        <Ionicons name={name as any} size={16} color={color} />
      </View>
      <View style={txS.info}>
        <Text style={txS.label} numberOfLines={1}>{tx.label}</Text>
        <Text style={txS.time}>{timeAgo(tx.timestamp)}</Text>
      </View>
      <Text style={[txS.amount, { color: isEarn ? C.success : C.pink }]}>
        {isEarn ? '+' : ''}{tx.amount.toLocaleString()}
        <Text style={txS.amountUnit}> $V</Text>
      </Text>
    </View>
  );
}

function makeTxStyles(C: AppColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border },
    rowLast: { borderBottomWidth: 0 },
    icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    info: { flex: 1, gap: 2 },
    label: { fontFamily: 'DMSans-Medium', fontSize: 14, color: C.textPrimary },
    time: { fontFamily: 'DMSans-Regular', fontSize: 12, color: C.textMuted },
    amount: { fontFamily: 'Syne-Bold', fontSize: 15 },
    amountUnit: { fontFamily: 'DMSans-Regular', fontSize: 11, color: 'inherit' as any },
  });
}

// ─── Transaction list (grouped by date) ───────────────────────────────────────

function TransactionList({ transactions }: { transactions: TokenTransaction[] }) {
  const { colors: C } = useTheme();
  const txListS = useMemo(() => makeTxListStyles(C), [C]);
  const groups = useMemo(() => {
    const map = new Map<string, TokenTransaction[]>();
    transactions.forEach((tx) => {
      const key = dateKey(tx.timestamp);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(tx);
    });
    return Array.from(map.entries()).slice(0, 6); // show max 6 date groups
  }, [transactions]);

  if (transactions.length === 0) {
    return (
      <View style={txListS.empty}>
        <View style={txListS.emptyIcon}>
          <Ionicons name="receipt-outline" size={26} color={C.textMuted} />
        </View>
        <Text style={txListS.emptyTitle}>No transactions yet</Text>
        <Text style={txListS.emptySub}>Go live to start earning $VIBA</Text>
      </View>
    );
  }

  return (
    <View style={txListS.wrap}>
      {groups.map(([dateLabel, txs]) => (
        <View key={dateLabel}>
          <Text style={txListS.dateLabel}>{dateLabel}</Text>
          <View style={txListS.group}>
            {txs.map((tx, i) => (
              <TxItem key={tx.id} tx={tx} last={i === txs.length - 1} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function makeTxListStyles(C: AppColors) {
  return StyleSheet.create({
    wrap: { gap: 16 },
    dateLabel: { fontFamily: 'DMSans-Medium', fontSize: 12, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
    group: { backgroundColor: C.bgCard, borderRadius: 16, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14 },
    empty: { alignItems: 'center', paddingVertical: 36, gap: 10, backgroundColor: C.bgCard, borderRadius: 16, borderWidth: 1, borderColor: C.border },
    emptyIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: C.bgGlass, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    emptyTitle: { fontFamily: 'Syne-Bold', fontSize: 15, color: C.textSecondary },
    emptySub: { fontFamily: 'DMSans-Regular', fontSize: 13, color: C.textMuted },
  });
}

// ─── Earn rate banner ─────────────────────────────────────────────────────────

function EarnBanner({ canStream }: { canStream: boolean }) {
  const { colors: C } = useTheme();
  const banner = useMemo(() => makeBannerStyles(C), [C]);
  if (canStream) return null;
  return (
    <Animated.View entering={FadeInDown.delay(160).duration(400)} style={banner.wrap}>
      <View style={banner.icon}>
        <Ionicons name="warning-outline" size={18} color={C.gold} />
      </View>
      <View style={banner.text}>
        <Text style={banner.title}>Low balance</Text>
        <Text style={banner.sub}>
          Add {MIN_VIBA_TO_STREAM} $VIBA to unlock streaming
        </Text>
      </View>
      <TouchableOpacity
        style={banner.btn}
        activeOpacity={0.8}
        onPress={() => Alert.alert('Buy $VIBA', 'Token purchases available at launch.')}
      >
        <Text style={banner.btnText}>Add</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function makeBannerStyles(C: AppColors) {
  return StyleSheet.create({
    wrap: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.goldDim, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,184,0,0.22)', padding: 14 },
    icon: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,184,0,0.15)', alignItems: 'center', justifyContent: 'center' },
    text: { flex: 1, gap: 2 },
    title: { fontFamily: 'DMSans-Bold', fontSize: 13, color: C.gold },
    sub: { fontFamily: 'DMSans-Regular', fontSize: 12, color: 'rgba(255,184,0,0.7)' },
    btn: { backgroundColor: C.gold, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
    btnText: { fontFamily: 'Syne-Bold', fontSize: 13, color: '#000' },
  });
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const { tokenBalance, tokenTransactions } = useApp();
  const { colors: C } = useTheme();
  const s = useMemo(() => makeWalletStyles(C), [C]);

  const canStream = tokenBalance >= MIN_VIBA_TO_STREAM;

  const earnedToday = useMemo(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    return tokenTransactions
      .filter((tx) => (tx.type === 'earn') && tx.timestamp.getTime() >= start)
      .reduce((s, tx) => s + tx.amount, 0);
  }, [tokenTransactions]);

  const handleBuy = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Buy $VIBA', 'Token purchases will be available when the Viba Token launches. Stay tuned!');
  };

  const handleCashOut = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Cash Out', 'Cash out to bank account will be available at token launch.');
  };

  const handleSend = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Send $VIBA', 'P2P transfers will be enabled after token launch.');
  };

  const handleActivity = () => {
    router.push('/activity');
  };

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: 110 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(0).duration(380)} style={s.header}>
        <Text style={s.title}>Wallet</Text>
        <TouchableOpacity
          style={s.historyBtn}
          onPress={handleActivity}
          activeOpacity={0.75}
        >
          <Ionicons name="time-outline" size={18} color={C.textSecondary} />
        </TouchableOpacity>
      </Animated.View>

      {/* Balance card */}
      <BalanceCard
        balance={tokenBalance}
        earnedToday={earnedToday}
        canStream={canStream}
      />

      {/* Low balance banner */}
      <EarnBanner canStream={canStream} />

      {/* Action row */}
      <Animated.View entering={FadeInUp.delay(140).duration(400)} style={s.actionRow}>
        <ActionBtn icon="add-outline" label="Add" onPress={handleBuy} primary delay={140} />
        <ActionBtn icon="arrow-up-outline" label="Cash Out" onPress={handleCashOut} soon delay={170} />
        <ActionBtn icon="paper-plane-outline" label="Send" onPress={handleSend} soon delay={200} />
        <ActionBtn icon="time-outline" label="Activity" onPress={handleActivity} delay={230} />
      </Animated.View>

      {/* Stats strip */}
      <StatStrip transactions={tokenTransactions} balance={tokenBalance} />

      {/* Weekly chart */}
      <WeeklyChart transactions={tokenTransactions} />

      {/* Quick links */}
      <QuickLinks />

      {/* Transactions section */}
      <View style={s.txHeader}>
        <Text style={s.txTitle}>Transactions</Text>
        <Text style={s.txCount}>{tokenTransactions.length} total</Text>
      </View>

      <Animated.View entering={FadeInDown.delay(320).duration(400)}>
        <TransactionList transactions={tokenTransactions} />
      </Animated.View>
    </ScrollView>
  );
}

function makeWalletStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    content: { paddingHorizontal: 20, gap: 14 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
    title: { fontFamily: 'Syne-ExtraBold', fontSize: 28, color: C.textPrimary },
    historyBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
    actionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8 },
    txHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
    txTitle: { fontFamily: 'Syne-Bold', fontSize: 17, color: C.textPrimary },
    txCount: { fontFamily: 'DMSans-Regular', fontSize: 12, color: C.textMuted },
  });
}
