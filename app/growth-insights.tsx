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
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { AppColors } from '@/constants/themes';
import { PLATFORMS, PlatformId, getPlatform } from '@/constants/platforms';

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = 'insights' | 'platforms' | 'timing' | 'audience';

interface Insight {
  id: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
  title: string;
  body: string;
  action: string;
  platform?: PlatformId;
  impact: string;
}

interface PlatformStat {
  id: PlatformId;
  watchTime: number;
  retention: string;
  topContent: string;
  growth: string;
  positive: boolean;
}

interface TimeSlot {
  hour: string;
  score: number;
  label?: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const INSIGHTS: Insight[] = [
  {
    id: '1', priority: 'high', icon: 'trending-up', platform: 'youtube',
    title: 'YouTube loves long-form',
    body: 'Your YouTube audience watches 24 min on average — 3x longer than TikTok. They want depth, not highlights.',
    action: 'Add a dedicated 30-min segment for YouTube watchers',
    impact: '+40% retention',
  },
  {
    id: '2', priority: 'high', icon: 'time',
    title: 'Stream 2 hours earlier',
    body: 'Your combined peak audience is active at 6:30 PM across all platforms. You\'re currently going live at 9 PM.',
    action: 'Shift your start time to 6:30 PM',
    impact: '+28% reach',
  },
  {
    id: '3', priority: 'medium', icon: 'people', platform: 'twitch',
    title: 'Twitch drives your real community',
    body: 'Twitch is only 18% of your viewers but accounts for 62% of your returning audience. They\'re your core.',
    action: 'Do exclusive content or shoutouts for Twitch viewers',
    impact: 'Stronger loyalty',
  },
  {
    id: '4', priority: 'medium', icon: 'flash',
    title: 'Rewards boost retention 2x',
    body: 'Streams where you activate Viewer Rewards have 2x returning viewer rate vs streams without.',
    action: 'Enable rewards for every stream, not just specials',
    impact: '2x return viewers',
  },
  {
    id: '5', priority: 'low', icon: 'share-social', platform: 'instagram',
    title: 'Instagram clips drive discovery',
    body: 'Clips you post from Instagram Live get 3x more shares than your TikTok clips. Lean into visual moments.',
    action: 'Clip and post 3 highlight moments after each stream',
    impact: '+15% new followers',
  },
  {
    id: '6', priority: 'low', icon: 'chatbubble', platform: 'tiktok',
    title: 'TikTok audience wants shorter Q&As',
    body: 'Your Q&A segments perform best on TikTok when under 3 minutes. Longer ones lose 60% of viewers.',
    action: 'Keep TikTok Q&A segments tight and fast',
    impact: '+22% completion',
  },
  {
    id: '7', priority: 'high', icon: 'rocket', platform: 'pumpfun',
    title: 'Pump.fun is your fastest-growing audience',
    body: 'Your Pump.fun viewers have 82% retention — the highest of any platform — and grew 94% this month. They stick around and they buy in.',
    action: 'Mention your token and bonding curve during streams',
    impact: '+94% growth',
  },
];

const PLATFORM_STATS: PlatformStat[] = [
  { id: 'youtube', watchTime: 24, retention: '68%', topContent: 'Long-form tutorials', growth: '+12%', positive: true },
  { id: 'twitch', watchTime: 19, retention: '71%', topContent: 'Gaming & live reactions', growth: '+8%', positive: true },
  { id: 'pumpfun', watchTime: 14, retention: '82%', topContent: 'Token launches & alpha', growth: '+94%', positive: true },
  { id: 'instagram', watchTime: 7, retention: '41%', topContent: 'Visual moments & lifestyle', growth: '+22%', positive: true },
  { id: 'tiktok', watchTime: 4, retention: '28%', topContent: 'Short clips & reactions', growth: '+31%', positive: true },
  { id: 'facebook', watchTime: 11, retention: '38%', topContent: 'Community discussions', growth: '-3%', positive: false },
];

const TIME_SLOTS: TimeSlot[] = [
  { hour: '4PM', score: 30 },
  { hour: '5PM', score: 58 },
  { hour: '6PM', score: 85 },
  { hour: '7PM', score: 96, label: 'Peak' },
  { hour: '8PM', score: 78 },
  { hour: '9PM', score: 52, label: 'You now' },
  { hour: '10PM', score: 34 },
];

// ─── Components ───────────────────────────────────────────────────────────────

function TabBar({ active, onChange, C }: { active: TabId; onChange: (t: TabId) => void; C: AppColors }) {
  const tabs: { id: TabId; label: string }[] = [
    { id: 'insights', label: 'Insights' },
    { id: 'platforms', label: 'Platforms' },
    { id: 'timing', label: 'Timing' },
    { id: 'audience', label: 'Audience' },
  ];
  const s = useMemo(() => tabStyles(C), [C]);
  return (
    <View style={s.bar}>
      {tabs.map((t) => (
        <TouchableOpacity
          key={t.id}
          style={[s.tab, active === t.id && s.tabActive]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(t.id); }}
          activeOpacity={0.7}
        >
          <Text style={[s.tabText, active === t.id && s.tabTextActive]}>{t.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function tabStyles(C: AppColors) {
  return StyleSheet.create({
    bar: { flexDirection: 'row', backgroundColor: C.bgCard, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 4, gap: 2 },
    tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
    tabActive: { backgroundColor: C.vibaDim, borderWidth: 1, borderColor: C.borderPurple },
    tabText: { fontFamily: 'DMSans-Medium', fontSize: 12, color: C.textMuted },
    tabTextActive: { color: C.viba, fontFamily: 'DMSans-Bold' },
  });
}

function InsightCard({ insight, delay, C }: { insight: Insight; delay: number; C: AppColors }) {
  const s = useMemo(() => insightCardStyles(C), [C]);
  const priorityColor = insight.priority === 'high' ? C.pink : insight.priority === 'medium' ? C.gold : C.viba;
  const platform = insight.platform ? getPlatform(insight.platform) : null;

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={s.card}>
      <View style={s.top}>
        <View style={[s.iconWrap, { backgroundColor: priorityColor + '22' }]}>
          <Ionicons name={insight.icon as any} size={16} color={priorityColor} />
        </View>
        <View style={s.topMeta}>
          {platform && (
            <View style={[s.platformTag, { backgroundColor: platform.gradient[0] + '22' }]}>
              <FontAwesome5 name={platform.icon} size={9} color={platform.gradient[0]} solid />
              <Text style={[s.platformTagText, { color: platform.gradient[0] }]}>{platform.name}</Text>
            </View>
          )}
          <View style={[s.priorityTag, { backgroundColor: priorityColor + '22', borderColor: priorityColor + '44' }]}>
            <Text style={[s.priorityText, { color: priorityColor }]}>
              {insight.priority === 'high' ? '🔴 High' : insight.priority === 'medium' ? '🟡 Medium' : '🟢 Low'}
            </Text>
          </View>
        </View>
      </View>
      <Text style={s.title}>{insight.title}</Text>
      <Text style={s.body}>{insight.body}</Text>
      <View style={s.footer}>
        <View style={s.actionRow}>
          <Ionicons name="arrow-forward-circle" size={14} color={C.viba} />
          <Text style={s.action}>{insight.action}</Text>
        </View>
        <View style={s.impactTag}>
          <Ionicons name="trending-up" size={11} color={C.success} />
          <Text style={s.impactText}>{insight.impact}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

function insightCardStyles(C: AppColors) {
  return StyleSheet.create({
    card: { backgroundColor: C.bgCard, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, gap: 10 },
    top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    iconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    topMeta: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    platformTag: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
    platformTagText: { fontFamily: 'DMSans-Bold', fontSize: 10 },
    priorityTag: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1 },
    priorityText: { fontFamily: 'DMSans-Bold', fontSize: 10 },
    title: { fontFamily: 'Syne-Bold', fontSize: 15, color: C.textPrimary },
    body: { fontFamily: 'DMSans-Regular', fontSize: 13, color: C.textSecondary, lineHeight: 19 },
    footer: { gap: 8, marginTop: 2 },
    actionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    action: { fontFamily: 'DMSans-Medium', fontSize: 12, color: C.viba, flex: 1 },
    impactTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.successDim, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(0,217,126,0.2)' },
    impactText: { fontFamily: 'DMSans-Bold', fontSize: 11, color: C.success },
  });
}

function PlatformStatCard({ stat, delay, C }: { stat: PlatformStat; delay: number; C: AppColors }) {
  const s = useMemo(() => platformStatStyles(C), [C]);
  const platform = getPlatform(stat.id);
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={s.card}>
      <View style={s.top}>
        <View style={[s.iconWrap, { backgroundColor: platform.gradient[0] }]}>
          <FontAwesome5 name={platform.icon} size={14} color="#FFF" solid />
        </View>
        <Text style={s.name}>{platform.name}</Text>
        <Text style={[s.growth, { color: stat.positive ? C.success : C.pink }]}>{stat.growth}</Text>
      </View>
      <View style={s.statsRow}>
        <View style={s.stat}>
          <Text style={s.statVal}>{stat.watchTime}m</Text>
          <Text style={s.statLabel}>Avg watch</Text>
        </View>
        <View style={s.divider} />
        <View style={s.stat}>
          <Text style={s.statVal}>{stat.retention}</Text>
          <Text style={s.statLabel}>Retention</Text>
        </View>
        <View style={s.divider} />
        <View style={[s.stat, { flex: 2 }]}>
          <Text style={s.statVal} numberOfLines={1}>{stat.topContent}</Text>
          <Text style={s.statLabel}>Top content</Text>
        </View>
      </View>
    </Animated.View>
  );
}

function platformStatStyles(C: AppColors) {
  return StyleSheet.create({
    card: { backgroundColor: C.bgCard, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, gap: 12 },
    top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconWrap: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    name: { fontFamily: 'Syne-Bold', fontSize: 14, color: C.textPrimary, flex: 1 },
    growth: { fontFamily: 'DMSans-Bold', fontSize: 13 },
    statsRow: { flexDirection: 'row', gap: 0 },
    stat: { flex: 1, alignItems: 'center', gap: 2 },
    divider: { width: 1, backgroundColor: C.border, marginVertical: 2 },
    statVal: { fontFamily: 'Syne-Bold', fontSize: 13, color: C.textPrimary },
    statLabel: { fontFamily: 'DMSans-Regular', fontSize: 10, color: C.textMuted },
  });
}

function TimingChart({ C }: { C: AppColors }) {
  const s = useMemo(() => timingStyles(C), [C]);
  const max = Math.max(...TIME_SLOTS.map((t) => t.score));
  return (
    <Animated.View entering={FadeInDown.delay(100).duration(500)} style={s.card}>
      <Text style={s.title}>Best time to go live</Text>
      <Text style={s.sub}>Combined audience activity across all platforms</Text>
      <View style={s.chart}>
        {TIME_SLOTS.map((slot, i) => {
          const pct = slot.score / max;
          const isPeak = slot.label === 'Peak';
          const isNow = slot.label === 'You now';
          return (
            <View key={slot.hour} style={s.col}>
              {slot.label && (
                <View style={[s.labelTag, isPeak ? s.peakTag : s.nowTag]}>
                  <Text style={[s.labelTagText, isPeak ? s.peakText : s.nowText]}>{slot.label}</Text>
                </View>
              )}
              <View style={s.barTrack}>
                <LinearGradient
                  colors={isPeak ? ['#FF2D87', '#7B2FFF'] : isNow ? [C.gold, C.gold] : [C.viba + '99', C.purple + '66']}
                  style={[s.barFill, { height: `${Math.max(pct * 100, 8)}%` }]}
                  start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                />
              </View>
              <Text style={[s.hour, (isPeak || isNow) && s.hourActive]}>{slot.hour}</Text>
            </View>
          );
        })}
      </View>
      <View style={s.tipRow}>
        <Ionicons name="flash" size={14} color={C.pink} />
        <Text style={s.tip}>Streaming at 7PM could increase your reach by up to 28%</Text>
      </View>
    </Animated.View>
  );
}

function timingStyles(C: AppColors) {
  return StyleSheet.create({
    card: { backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 18, gap: 14 },
    title: { fontFamily: 'Syne-Bold', fontSize: 16, color: C.textPrimary },
    sub: { fontFamily: 'DMSans-Regular', fontSize: 12, color: C.textMuted, marginTop: -8 },
    chart: { flexDirection: 'row', gap: 6, height: 120, alignItems: 'flex-end' },
    col: { flex: 1, alignItems: 'center', gap: 5, height: '100%', justifyContent: 'flex-end' },
    barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end', borderRadius: 6, overflow: 'hidden', backgroundColor: C.border },
    barFill: { width: '100%', borderRadius: 6, overflow: 'hidden' },
    hour: { fontFamily: 'DMSans-Regular', fontSize: 9, color: C.textMuted },
    hourActive: { color: C.pink, fontFamily: 'DMSans-Bold' },
    labelTag: { borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2, marginBottom: 2 },
    peakTag: { backgroundColor: C.pinkDim },
    nowTag: { backgroundColor: C.goldDim },
    labelTagText: { fontFamily: 'DMSans-Bold', fontSize: 8 },
    peakText: { color: C.pink },
    nowText: { color: C.gold },
    tipRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.pinkDim, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: C.borderPink },
    tip: { fontFamily: 'DMSans-Medium', fontSize: 12, color: C.textSecondary, flex: 1 },
  });
}

function AudienceTab({ C }: { C: AppColors }) {
  const s = useMemo(() => audienceStyles(C), [C]);
  const demographics = [
    { platform: 'tiktok' as PlatformId, age: '18–24', topCountry: 'Nigeria', female: 58, male: 42 },
    { platform: 'youtube' as PlatformId, age: '25–34', topCountry: 'USA', female: 41, male: 59 },
    { platform: 'twitch' as PlatformId, age: '18–28', topCountry: 'UK', female: 32, male: 68 },
    { platform: 'instagram' as PlatformId, age: '22–32', topCountry: 'Ghana', female: 64, male: 36 },
  ];
  return (
    <View style={{ gap: 10 }}>
      {demographics.map((d, i) => {
        const platform = getPlatform(d.platform);
        return (
          <Animated.View key={d.platform} entering={FadeInDown.delay(i * 80).duration(400)} style={s.card}>
            <View style={s.top}>
              <View style={[s.icon, { backgroundColor: platform.gradient[0] }]}>
                <FontAwesome5 name={platform.icon} size={13} color="#FFF" solid />
              </View>
              <Text style={s.platformName}>{platform.name}</Text>
            </View>
            <View style={s.row}>
              <View style={s.cell}>
                <Text style={s.cellVal}>{d.age}</Text>
                <Text style={s.cellLabel}>Age range</Text>
              </View>
              <View style={s.cell}>
                <Text style={s.cellVal}>{d.topCountry}</Text>
                <Text style={s.cellLabel}>Top country</Text>
              </View>
              <View style={[s.cell, { flex: 2 }]}>
                <View style={s.genderBar}>
                  <View style={[s.genderFill, { flex: d.female, backgroundColor: C.pink }]} />
                  <View style={[s.genderFill, { flex: d.male, backgroundColor: C.purple }]} />
                </View>
                <View style={s.genderLegend}>
                  <Text style={[s.genderText, { color: C.pink }]}>{d.female}% F</Text>
                  <Text style={[s.genderText, { color: C.purple }]}>{d.male}% M</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}

function audienceStyles(C: AppColors) {
  return StyleSheet.create({
    card: { backgroundColor: C.bgCard, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, gap: 12 },
    top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    icon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    platformName: { fontFamily: 'Syne-Bold', fontSize: 14, color: C.textPrimary },
    row: { flexDirection: 'row', gap: 0 },
    cell: { flex: 1, alignItems: 'center', gap: 3 },
    cellVal: { fontFamily: 'Syne-Bold', fontSize: 13, color: C.textPrimary },
    cellLabel: { fontFamily: 'DMSans-Regular', fontSize: 10, color: C.textMuted },
    genderBar: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', width: '90%' },
    genderFill: { height: '100%' },
    genderLegend: { flexDirection: 'row', gap: 8, marginTop: 2 },
    genderText: { fontFamily: 'DMSans-Bold', fontSize: 10 },
  });
}

// ─── Summary banner ───────────────────────────────────────────────────────────

function SummaryBanner({ C }: { C: AppColors }) {
  const s = useMemo(() => summaryStyles(C), [C]);
  return (
    <Animated.View entering={FadeInDown.delay(60).duration(500)}>
      <LinearGradient colors={C.gradientCard} style={s.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={s.row}>
          <View style={s.stat}>
            <Text style={s.statVal}>6</Text>
            <Text style={s.statLabel}>New insights</Text>
          </View>
          <View style={s.divider} />
          <View style={s.stat}>
            <Text style={[s.statVal, { color: C.success }]}>+28%</Text>
            <Text style={s.statLabel}>Potential reach</Text>
          </View>
          <View style={s.divider} />
          <View style={s.stat}>
            <Text style={[s.statVal, { color: C.pink }]}>2</Text>
            <Text style={s.statLabel}>Urgent actions</Text>
          </View>
        </View>
        <View style={s.aiRow}>
          <Ionicons name="sparkles" size={13} color={C.viba} />
          <Text style={s.aiText}>Powered by Viba AI · Updated after every stream</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

function summaryStyles(C: AppColors) {
  return StyleSheet.create({
    card: { borderRadius: 18, borderWidth: 1, borderColor: C.borderPurple, padding: 18, gap: 14 },
    row: { flexDirection: 'row' },
    stat: { flex: 1, alignItems: 'center', gap: 3 },
    statVal: { fontFamily: 'Syne-ExtraBold', fontSize: 24, color: C.textPrimary },
    statLabel: { fontFamily: 'DMSans-Regular', fontSize: 11, color: C.textMuted },
    divider: { width: 1, backgroundColor: C.border, marginVertical: 4 },
    aiRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
    aiText: { fontFamily: 'DMSans-Regular', fontSize: 11, color: C.textMuted },
  });
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function GrowthInsightsScreen() {
  const insets = useSafeAreaInsets();
  const { colors: C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const [activeTab, setActiveTab] = useState<TabId>('insights');

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(300)} style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Ionicons name="sparkles" size={16} color={C.viba} />
          <Text style={s.title}>AI Growth Insights</Text>
        </View>
        <View style={{ width: 38 }} />
      </Animated.View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <SummaryBanner C={C} />
        <TabBar active={activeTab} onChange={setActiveTab} C={C} />

        {activeTab === 'insights' && (
          <View style={s.list}>
            {INSIGHTS.map((insight, i) => (
              <InsightCard key={insight.id} insight={insight} delay={i * 60} C={C} />
            ))}
          </View>
        )}

        {activeTab === 'platforms' && (
          <View style={s.list}>
            {PLATFORM_STATS.map((stat, i) => (
              <PlatformStatCard key={stat.id} stat={stat} delay={i * 70} C={C} />
            ))}
          </View>
        )}

        {activeTab === 'timing' && (
          <View style={s.list}>
            <TimingChart C={C} />
          </View>
        )}

        {activeTab === 'audience' && (
          <View style={s.list}>
            <AudienceTab C={C} />
          </View>
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
    headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    title: { fontFamily: 'Syne-Bold', fontSize: 17, color: C.textPrimary },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: 20, gap: 14 },
    list: { gap: 10 },
  });
}
