import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { AppColors } from '@/constants/themes';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Rule {
  id: string;
  label: string;
  desc: string;
  icon: string;
  color: string;
  value: string;
  enabled: boolean;
}

interface TopViewer {
  rank: number;
  username: string;
  platform: string;
  platformColor: string;
  minutes: number;
  earned: number;
  badge?: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const TOP_VIEWERS: TopViewer[] = [
  { rank: 1, username: 'nova_waves', platform: 'TikTok', platformColor: '#010101', minutes: 58, earned: 124, badge: '🏆' },
  { rank: 2, username: 'realbea', platform: 'Instagram', platformColor: '#E1306C', minutes: 51, earned: 98, badge: '🥈' },
  { rank: 3, username: 'streamlord', platform: 'Twitch', platformColor: '#9146FF', minutes: 47, earned: 86, badge: '🥉' },
  { rank: 4, username: 'techvibes99', platform: 'YouTube', platformColor: '#FF0000', minutes: 39, earned: 64 },
  { rank: 5, username: 'zara.live', platform: 'TikTok', platformColor: '#010101', minutes: 34, earned: 52 },
];

// ─── Components ───────────────────────────────────────────────────────────────

function PoolCard({
  enabled,
  poolPct,
  onToggle,
  onChangePool,
  C,
}: {
  enabled: boolean;
  poolPct: number;
  onToggle: () => void;
  onChangePool: (dir: 'up' | 'down') => void;
  C: AppColors;
}) {
  const s = useMemo(() => poolCardStyles(C), [C]);
  const estimatedTokens = Math.round((poolPct / 100) * 1240);

  return (
    <Animated.View entering={FadeInDown.delay(80).duration(500)}>
      <LinearGradient colors={C.gradientCard} style={s.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={s.row}>
          <View style={s.left}>
            <View style={s.iconWrap}>
              <Ionicons name="people" size={18} color={C.viba} />
            </View>
            <View>
              <Text style={s.title}>Viewer Rewards</Text>
              <Text style={s.sub}>Share earnings with your audience</Text>
            </View>
          </View>
          <Switch
            value={enabled}
            onValueChange={onToggle}
            trackColor={{ false: C.border, true: C.vibaDim }}
            thumbColor={enabled ? C.viba : C.textMuted}
          />
        </View>

        {enabled && (
          <Animated.View entering={FadeInDown.duration(300)} style={s.poolRow}>
            <View style={s.poolLeft}>
              <Text style={s.poolLabel}>Pool size</Text>
              <Text style={s.poolSub}>~{estimatedTokens} $VIBA per hr stream</Text>
            </View>
            <View style={s.poolControl}>
              <TouchableOpacity
                style={s.poolBtn}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChangePool('down'); }}
                disabled={poolPct <= 5}
              >
                <Ionicons name="remove" size={16} color={poolPct <= 5 ? C.textMuted : C.textPrimary} />
              </TouchableOpacity>
              <Text style={s.poolPct}>{poolPct}%</Text>
              <TouchableOpacity
                style={s.poolBtn}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChangePool('up'); }}
                disabled={poolPct >= 50}
              >
                <Ionicons name="add" size={16} color={poolPct >= 50 ? C.textMuted : C.textPrimary} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </LinearGradient>
    </Animated.View>
  );
}

function poolCardStyles(C: AppColors) {
  return StyleSheet.create({
    card: { borderRadius: 18, borderWidth: 1, borderColor: C.borderPurple, padding: 18, gap: 16 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    left: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    iconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.vibaDim, alignItems: 'center', justifyContent: 'center' },
    title: { fontFamily: 'Syne-Bold', fontSize: 15, color: C.textPrimary },
    sub: { fontFamily: 'DMSans-Regular', fontSize: 12, color: C.textMuted, marginTop: 1 },
    poolRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.bgGlass, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border },
    poolLeft: { gap: 2 },
    poolLabel: { fontFamily: 'DMSans-Bold', fontSize: 13, color: C.textPrimary },
    poolSub: { fontFamily: 'DMSans-Regular', fontSize: 11, color: C.textMuted },
    poolControl: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    poolBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
    poolPct: { fontFamily: 'Syne-Bold', fontSize: 22, color: C.viba, minWidth: 46, textAlign: 'center' },
  });
}

function RuleCard({ rule, onToggle, delay, C }: { rule: Rule; onToggle: () => void; delay: number; C: AppColors }) {
  const s = useMemo(() => ruleStyles(C), [C]);
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={s.card}>
      <View style={[s.iconWrap, { backgroundColor: rule.color + '22' }]}>
        <Ionicons name={rule.icon as any} size={16} color={rule.color} />
      </View>
      <View style={s.info}>
        <Text style={s.label}>{rule.label}</Text>
        <Text style={s.desc}>{rule.desc}</Text>
      </View>
      <View style={s.right}>
        <Text style={[s.value, { color: rule.color }]}>{rule.value}</Text>
        <Switch
          value={rule.enabled}
          onValueChange={onToggle}
          trackColor={{ false: C.border, true: rule.color + '55' }}
          thumbColor={rule.enabled ? rule.color : C.textMuted}
          style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
        />
      </View>
    </Animated.View>
  );
}

function ruleStyles(C: AppColors) {
  return StyleSheet.create({
    card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.bgCard, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14 },
    iconWrap: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    info: { flex: 1, gap: 2 },
    label: { fontFamily: 'DMSans-Bold', fontSize: 13, color: C.textPrimary },
    desc: { fontFamily: 'DMSans-Regular', fontSize: 11, color: C.textMuted },
    right: { alignItems: 'flex-end', gap: 2 },
    value: { fontFamily: 'Syne-Bold', fontSize: 12 },
  });
}

function BonusDropButton({ C }: { C: AppColors }) {
  const s = useMemo(() => bonusStyles(C), [C]);
  const handleDrop = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert('Bonus Drop! 🎉', 'All viewers watching right now will receive 50 $VIBA tokens instantly.');
  };
  return (
    <Animated.View entering={ZoomIn.delay(400).duration(400)}>
      <TouchableOpacity activeOpacity={0.85} onPress={handleDrop}>
        <LinearGradient colors={['#FF2D87', '#7B2FFF']} style={s.btn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <Ionicons name="flash" size={18} color="#FFF" />
          <View>
            <Text style={s.btnTitle}>Drop Bonus Now</Text>
            <Text style={s.btnSub}>Send 50 $VIBA to everyone watching</Text>
          </View>
          <View style={s.btnArrow}>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

function bonusStyles(C: AppColors) {
  return StyleSheet.create({
    btn: { borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12 },
    btnTitle: { fontFamily: 'Syne-Bold', fontSize: 15, color: '#FFF' },
    btnSub: { fontFamily: 'DMSans-Regular', fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
    btnArrow: { marginLeft: 'auto' },
  });
}

function ViewerRow({ viewer, C }: { viewer: TopViewer; C: AppColors }) {
  const s = useMemo(() => viewerRowStyles(C), [C]);
  return (
    <View style={s.row}>
      <Text style={s.rank}>{viewer.badge ?? `#${viewer.rank}`}</Text>
      <View style={[s.platformDot, { backgroundColor: viewer.platformColor }]} />
      <View style={s.info}>
        <Text style={s.username}>@{viewer.username}</Text>
        <Text style={s.meta}>{viewer.minutes} min · {viewer.platform}</Text>
      </View>
      <View style={s.earnedWrap}>
        <Text style={s.earned}>+{viewer.earned}</Text>
        <Text style={s.earnedUnit}> $V</Text>
      </View>
    </View>
  );
}

function viewerRowStyles(C: AppColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.border },
    rank: { fontFamily: 'Syne-Bold', fontSize: 14, color: C.textMuted, width: 28, textAlign: 'center' },
    platformDot: { width: 8, height: 8, borderRadius: 4 },
    info: { flex: 1, gap: 1 },
    username: { fontFamily: 'DMSans-Bold', fontSize: 14, color: C.textPrimary },
    meta: { fontFamily: 'DMSans-Regular', fontSize: 11, color: C.textMuted },
    earnedWrap: { flexDirection: 'row', alignItems: 'baseline' },
    earned: { fontFamily: 'Syne-Bold', fontSize: 15, color: C.success },
    earnedUnit: { fontFamily: 'DMSans-Regular', fontSize: 11, color: C.textMuted },
  });
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ViewerRewardsScreen() {
  const insets = useSafeAreaInsets();
  const { colors: C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);

  const [enabled, setEnabled] = useState(true);
  const [poolPct, setPoolPct] = useState(20);
  const [rules, setRules] = useState<Rule[]>([
    { id: 'watchtime', label: 'Watch Time', desc: 'Base $VIBA per minute watched', icon: 'time-outline', color: C.viba, value: '1x base', enabled: true },
    { id: 'comments', label: 'Comments', desc: 'Bonus for engaging in chat', icon: 'chatbubble-outline', color: C.pink, value: '2x boost', enabled: true },
    { id: 'sharing', label: 'Stream Share', desc: 'Reward viewers who share your link', icon: 'share-social-outline', color: '#00D97E', value: '+50 $V', enabled: true },
    { id: 'returning', label: 'Loyalty Bonus', desc: 'Extra for viewers who return', icon: 'heart-outline', color: C.gold, value: '1.5x boost', enabled: true },
    { id: 'firsttime', label: 'Welcome Bonus', desc: 'Attract new viewers with a reward', icon: 'star-outline', color: C.purpleLight, value: '+20 $V', enabled: false },
  ]);

  const toggleRule = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRules((prev) => prev.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setEnabled((v) => !v);
  };

  const handlePool = (dir: 'up' | 'down') => {
    setPoolPct((v) => Math.min(50, Math.max(5, v + (dir === 'up' ? 5 : -5))));
  };

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(300)} style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={s.title}>Viewer Rewards</Text>
          <Text style={s.subtitle}>You control who earns and how much</Text>
        </View>
        <View style={{ width: 38 }} />
      </Animated.View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Pool toggle + size */}
        <PoolCard
          enabled={enabled}
          poolPct={poolPct}
          onToggle={handleToggle}
          onChangePool={handlePool}
          C={C}
        />

        {enabled && (
          <>
            {/* Rules */}
            <Animated.View entering={FadeInDown.delay(160).duration(400)}>
              <Text style={s.sectionTitle}>Earning Rules</Text>
              <Text style={s.sectionSub}>Configure how your viewers earn from your pool</Text>
            </Animated.View>

            <View style={s.rulesList}>
              {rules.map((rule, i) => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  onToggle={() => toggleRule(rule.id)}
                  delay={200 + i * 50}
                  C={C}
                />
              ))}
            </View>

            {/* Bonus drop */}
            <Animated.View entering={FadeInDown.delay(380).duration(400)}>
              <Text style={s.sectionTitle}>Live Bonus</Text>
              <Text style={s.sectionSub}>Trigger an instant drop for everyone watching right now</Text>
            </Animated.View>
            <BonusDropButton C={C} />

            {/* Last stream leaderboard */}
            <Animated.View entering={FadeInDown.delay(440).duration(400)}>
              <View style={s.leaderHeader}>
                <Text style={s.sectionTitle}>Last Stream Top Earners</Text>
                <View style={s.liveTag}>
                  <Text style={s.liveTagText}>5 viewers</Text>
                </View>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(480).duration(400)} style={s.leaderCard}>
              {TOP_VIEWERS.map((v, i) => (
                <ViewerRow key={v.rank} viewer={v} C={C} />
              ))}
            </Animated.View>

            {/* Info tip */}
            <Animated.View entering={FadeInUp.delay(520).duration(400)} style={s.tip}>
              <Ionicons name="information-circle-outline" size={16} color={C.viba} />
              <Text style={s.tipText}>
                Tokens are distributed automatically at the end of each stream based on your rules.
              </Text>
            </Animated.View>
          </>
        )}

        {!enabled && (
          <Animated.View entering={FadeInDown.delay(120).duration(400)} style={s.disabledState}>
            <View style={s.disabledIcon}>
              <Ionicons name="people-outline" size={32} color={C.textMuted} />
            </View>
            <Text style={s.disabledTitle}>Viewer Rewards Off</Text>
            <Text style={s.disabledSub}>
              Turn on to share a portion of your stream earnings with your audience and build a loyal community.
            </Text>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: C.bg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
    backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
    title: { fontFamily: 'Syne-Bold', fontSize: 17, color: C.textPrimary, textAlign: 'center' },
    subtitle: { fontFamily: 'DMSans-Regular', fontSize: 12, color: C.textMuted, textAlign: 'center', marginTop: 1 },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: 20, gap: 14 },
    sectionTitle: { fontFamily: 'Syne-Bold', fontSize: 15, color: C.textPrimary },
    sectionSub: { fontFamily: 'DMSans-Regular', fontSize: 12, color: C.textMuted, marginTop: 2 },
    rulesList: { gap: 8 },
    leaderHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    liveTag: { backgroundColor: C.successDim, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(0,217,126,0.2)' },
    liveTagText: { fontFamily: 'DMSans-Bold', fontSize: 11, color: C.success },
    leaderCard: { backgroundColor: C.bgCard, borderRadius: 16, borderWidth: 1, borderColor: C.border, paddingHorizontal: 16 },
    tip: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: C.vibaDim, borderRadius: 12, borderWidth: 1, borderColor: C.borderPurple, padding: 14 },
    tipText: { fontFamily: 'DMSans-Regular', fontSize: 12, color: C.textSecondary, flex: 1, lineHeight: 18 },
    disabledState: { alignItems: 'center', paddingVertical: 48, gap: 12 },
    disabledIcon: { width: 72, height: 72, borderRadius: 22, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    disabledTitle: { fontFamily: 'Syne-Bold', fontSize: 17, color: C.textSecondary },
    disabledSub: { fontFamily: 'DMSans-Regular', fontSize: 13, color: C.textMuted, textAlign: 'center', maxWidth: 280, lineHeight: 20 },
  });
}
