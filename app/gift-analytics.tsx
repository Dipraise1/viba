import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { AppColors } from '@/constants/themes';
import { PLATFORMS, PlatformId, getPlatform } from '@/constants/platforms';

type Period = 'today' | 'week' | 'month' | 'all';

const PERIODS: { id: Period; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'all', label: 'All time' },
];

const GIFT_DATA: Record<Period, { total: string; breakdown: { platform: PlatformId; amount: string; gifts: number }[] }> = {
  today: {
    total: '$47',
    breakdown: [
      { platform: 'tiktok', amount: '$24', gifts: 32 },
      { platform: 'instagram', amount: '$14', gifts: 18 },
      { platform: 'twitch', amount: '$9', gifts: 6 },
    ],
  },
  week: {
    total: '$312',
    breakdown: [
      { platform: 'tiktok', amount: '$148', gifts: 210 },
      { platform: 'instagram', amount: '$87', gifts: 112 },
      { platform: 'twitch', amount: '$51', gifts: 34 },
      { platform: 'youtube', amount: '$26', gifts: 28 },
    ],
  },
  month: {
    total: '$1,240',
    breakdown: [
      { platform: 'tiktok', amount: '$580', gifts: 820 },
      { platform: 'instagram', amount: '$340', gifts: 440 },
      { platform: 'twitch', amount: '$210', gifts: 140 },
      { platform: 'youtube', amount: '$110', gifts: 105 },
    ],
  },
  all: {
    total: '$4,890',
    breakdown: [
      { platform: 'tiktok', amount: '$2,200', gifts: 3100 },
      { platform: 'instagram', amount: '$1,300', gifts: 1800 },
      { platform: 'twitch', amount: '$860', gifts: 560 },
      { platform: 'youtube', amount: '$530', gifts: 490 },
    ],
  },
};

interface GiftEvent {
  id: string;
  platform: PlatformId;
  username: string;
  giftName: string;
  count: number;
  value: string;
  time: string;
}

const RECENT_GIFTS: GiftEvent[] = [
  { id: '1', platform: 'tiktok', username: 'jaywave', giftName: 'Rose', count: 5, value: '$2.50', time: '2 min ago' },
  { id: '2', platform: 'instagram', username: 'maya.creates', giftName: 'Star', count: 20, value: '$4.00', time: '5 min ago' },
  { id: '3', platform: 'twitch', username: 'streamlord', giftName: 'Bits', count: 500, value: '$5.00', time: '8 min ago' },
  { id: '4', platform: 'tiktok', username: 'noodles_fan', giftName: 'Rose', count: 1, value: '$0.50', time: '12 min ago' },
  { id: '5', platform: 'youtube', username: 'techvibes99', giftName: 'Super Chat', count: 1, value: '$10.00', time: '15 min ago' },
  { id: '6', platform: 'tiktok', username: 'ghostvibes', giftName: 'TikTok Diamond', count: 3, value: '$7.50', time: '20 min ago' },
  { id: '7', platform: 'instagram', username: 'dre_art', giftName: 'Star', count: 50, value: '$10.00', time: '25 min ago' },
];

function GiftEmoji({ name }: { name: string }) {
  const map: Record<string, string> = {
    Rose: '🌹', Star: '⭐', Bits: '💎', 'Super Chat': '💬', 'TikTok Diamond': '💠', default: '🎁',
  };
  return <Text style={{ fontSize: 22 }}>{map[name] ?? map.default}</Text>;
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: C.bg },
    navHeader: {
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
    navTitle: {
      fontFamily: 'Syne-Bold',
      fontSize: 17,
      color: C.textPrimary,
    },
    exportBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: C.bgCard,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: C.border,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    exportText: {
      fontFamily: 'DMSans-Medium',
      fontSize: 13,
      color: C.textSecondary,
    },
    container: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: 16, gap: 14 },
    periodRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    periodPill: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: C.bgCard,
      borderWidth: 1,
      borderColor: C.border,
    },
    periodPillActive: {
      backgroundColor: C.pinkDim,
      borderColor: C.borderPink,
    },
    periodText: {
      fontFamily: 'DMSans-Medium',
      fontSize: 13,
      color: C.textMuted,
    },
    periodTextActive: { color: C.pink },
    totalCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: C.borderPink,
      padding: 24,
      overflow: 'hidden',
      gap: 6,
    },
    totalLabel: {
      fontFamily: 'DMSans-Medium',
      fontSize: 13,
      color: C.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    totalAmount: {
      fontFamily: 'Syne-ExtraBold',
      fontSize: 48,
      color: C.textPrimary,
      lineHeight: 52,
    },
    totalMeta: { flexDirection: 'row', gap: 16, marginTop: 4 },
    totalMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    totalMetaText: {
      fontFamily: 'DMSans-Regular',
      fontSize: 13,
      color: C.textMuted,
    },
    sectionTitle: {
      fontFamily: 'Syne-Bold',
      fontSize: 16,
      color: C.textPrimary,
    },
    breakdownList: { gap: 10 },
    breakdownCard: {
      backgroundColor: C.bgCard,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
      padding: 14,
      gap: 10,
    },
    breakdownTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    platformIconSmall: {
      width: 30,
      height: 30,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    breakdownName: {
      fontFamily: 'DMSans-Bold',
      fontSize: 14,
      color: C.textPrimary,
    },
    breakdownGifts: {
      fontFamily: 'DMSans-Regular',
      fontSize: 12,
      color: C.textMuted,
      marginRight: 8,
    },
    breakdownAmount: {
      fontFamily: 'Syne-Bold',
      fontSize: 16,
      color: C.gold,
    },
    barTrack: {
      height: 4,
      backgroundColor: C.bgGlass,
      borderRadius: 2,
      overflow: 'hidden',
    },
    barFill: { height: 4, borderRadius: 2, opacity: 0.7 },
    recentList: { gap: 0 },
    giftRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    giftLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    giftInfo: { gap: 2, flex: 1 },
    giftNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    giftName: {
      fontFamily: 'DMSans-Bold',
      fontSize: 14,
      color: C.textPrimary,
    },
    platformTagSmall: {
      width: 20,
      height: 20,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    giftFrom: {
      fontFamily: 'DMSans-Regular',
      fontSize: 12,
      color: C.textMuted,
    },
    giftRight: { alignItems: 'flex-end', gap: 2 },
    giftValue: {
      fontFamily: 'Syne-Bold',
      fontSize: 15,
      color: C.gold,
    },
    giftTime: {
      fontFamily: 'DMSans-Regular',
      fontSize: 11,
      color: C.textMuted,
    },
  });
}

export default function GiftAnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [period, setPeriod] = useState<Period>('week');
  const data = GIFT_DATA[period];
  const totalGifts = data.breakdown.reduce((s, b) => s + b.gifts, 0);
  const maxAmount = Math.max(...data.breakdown.map((b) => parseFloat(b.amount.replace(/[$,]/g, ''))));

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Animated.View entering={FadeInDown.duration(300)} style={styles.navHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Gift Analytics</Text>
        <TouchableOpacity style={styles.exportBtn} activeOpacity={0.7}>
          <Ionicons name="download-outline" size={16} color={C.textSecondary} />
          <Text style={styles.exportText}>Export</Text>
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Period selector */}
        <Animated.View entering={FadeInDown.delay(60).duration(500)} style={styles.periodRow}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.periodPill, period === p.id && styles.periodPillActive]}
              onPress={() => setPeriod(p.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.periodText, period === p.id && styles.periodTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Total earned card */}
        <Animated.View entering={FadeInDown.delay(120).duration(500)}>
          <View style={styles.totalCard}>
            <LinearGradient
              colors={C.gradientCard}
              style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Text style={styles.totalLabel}>Total earned</Text>
            <Text style={styles.totalAmount}>{data.total}</Text>
            <View style={styles.totalMeta}>
              <View style={styles.totalMetaItem}>
                <Ionicons name="gift-outline" size={14} color={C.textMuted} />
                <Text style={styles.totalMetaText}>{totalGifts} gifts</Text>
              </View>
              <View style={styles.totalMetaItem}>
                <FontAwesome5 name="broadcast-tower" size={12} color={C.textMuted} />
                <Text style={styles.totalMetaText}>{data.breakdown.length} platforms</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Platform breakdown */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Text style={styles.sectionTitle}>Platform breakdown</Text>
        </Animated.View>

        <View style={styles.breakdownList}>
          {data.breakdown.map((b, index) => {
            const platform = getPlatform(b.platform);
            const pct = parseFloat(b.amount.replace(/[$,]/g, '')) / maxAmount;
            return (
              <Animated.View
                key={b.platform}
                entering={FadeInDown.delay(240 + index * 60).duration(400)}
                style={styles.breakdownCard}
              >
                <View style={styles.breakdownTop}>
                  <View style={[styles.platformIconSmall, { backgroundColor: platform.gradient[0] }]}>
                    <FontAwesome5 name={platform.icon} size={13} color="#FFFFFF" solid />
                  </View>
                  <Text style={styles.breakdownName}>{platform.name}</Text>
                  <View style={{ flex: 1 }} />
                  <Text style={styles.breakdownGifts}>{b.gifts} gifts</Text>
                  <Text style={styles.breakdownAmount}>{b.amount}</Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: platform.gradient[0] as string }]} />
                </View>
              </Animated.View>
            );
          })}
        </View>

        {/* Recent gifts */}
        <Animated.View entering={FadeInDown.delay(480).duration(500)}>
          <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Recent gifts</Text>
        </Animated.View>

        <View style={styles.recentList}>
          {RECENT_GIFTS.map((g, index) => {
            const platform = getPlatform(g.platform);
            return (
              <Animated.View
                key={g.id}
                entering={FadeInDown.delay(520 + index * 50).duration(400)}
                style={styles.giftRow}
              >
                <View style={styles.giftLeft}>
                  <GiftEmoji name={g.giftName} />
                  <View style={styles.giftInfo}>
                    <View style={styles.giftNameRow}>
                      <Text style={styles.giftName}>
                        {g.count > 1 ? `${g.count}x ` : ''}{g.giftName}
                      </Text>
                      <View style={[styles.platformTagSmall, { backgroundColor: platform.gradient[0] + '22' }]}>
                        <FontAwesome5 name={platform.icon} size={9} color={platform.gradient[0]} solid />
                      </View>
                    </View>
                    <Text style={styles.giftFrom}>from @{g.username}</Text>
                  </View>
                </View>
                <View style={styles.giftRight}>
                  <Text style={styles.giftValue}>{g.value}</Text>
                  <Text style={styles.giftTime}>{g.time}</Text>
                </View>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
