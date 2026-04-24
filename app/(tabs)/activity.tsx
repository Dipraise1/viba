import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/themes';
import { getNotifications, getFollowingStatuses, markNotificationRead, type AppNotification, type UserStatus } from '@/lib/activityService';
import { getConversations, type ConversationPreview } from '@/lib/messages';

// ─── Types ────────────────────────────────────────────────────────────────────

type ActivityType = 'follow' | 'like' | 'comment' | 'gift' | 'live' | 'mention';

interface ActivityItem {
  id: string;
  type: ActivityType;
  actor: string;
  actorId: string;
  actorHandle: string;
  text: string;
  time: string;
  read: boolean;
  gradSeed: number;
}

interface ChatItem {
  id: string;         // other_user_id — used for navigation to /chat/{id}
  name: string;
  handle: string;
  lastMessage: string;
  time: string;
  unread: number;
  isLive: boolean;
  gradSeed: number;
}

interface StatusItem {
  id: string;
  name: string;
  isLive: boolean;
  status?: string;
  gradSeed: number;
  seen?: boolean;
}

// ─── Data mapping helpers ─────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function notifTypeToActivityType(t: string): ActivityType {
  if (t === 'stream_live') return 'live';
  return t as ActivityType;
}

function notifText(n: AppNotification): string {
  if (n.message) return n.message;
  switch (n.type) {
    case 'follow':      return 'started following you';
    case 'like':        return 'liked your post';
    case 'comment':     return 'commented on your post';
    case 'gift':        return 'sent you a gift';
    case 'stream_live': return 'just went live — tune in!';
    default:            return 'interacted with you';
  }
}

function toActivityItem(n: AppNotification): ActivityItem {
  const name   = n.actor?.display_name ?? 'Someone';
  const handle = (n.actor?.handle ?? 'user').replace(/^@/, '');
  const seed   = handle.charCodeAt(0) % 8;
  return {
    id:          n.id,
    type:        notifTypeToActivityType(n.type),
    actor:       name,
    actorId:     n.actor_id ?? '',
    actorHandle: handle,
    text:        notifText(n),
    time:        relativeTime(n.created_at),
    read:        n.read,
    gradSeed:    seed,
  };
}

function toChatItem(c: ConversationPreview): ChatItem {
  const handle = (c.other_handle ?? 'user').replace(/^@/, '');
  const seed   = handle.charCodeAt(0) % 8;
  const time   = c.last_message_at ? relativeTime(c.last_message_at) : '';
  return {
    id:          c.other_user_id,        // navigate to /chat/{other_user_id}
    name:        c.other_name,
    handle:      `@${handle}`,
    lastMessage: c.last_message ?? '',
    time,
    unread:      c.has_unread ? 1 : 0,
    isLive:      false,
    gradSeed:    seed,
  };
}

function toStatusItem(s: UserStatus): StatusItem {
  const name = s.profile?.display_name ?? 'User';
  const seed = (s.profile?.handle ?? '').charCodeAt(0) % 8;
  return {
    id:       s.user_id,
    name,
    isLive:   s.is_live,
    status:   s.is_live ? undefined : s.content,
    gradSeed: seed,
  };
}

const GRADIENT_POOL: [string, string][] = [
  ['#FF2D87', '#7B2FFF'],
  ['#FF6B35', '#C020E0'],
  ['#00D4AA', '#0094FF'],
  ['#FFD700', '#FF6B35'],
  ['#00C9FF', '#7B2FFF'],
  ['#FC466B', '#3F5EFB'],
  ['#f7971e', '#ffd200'],
  ['#11998e', '#38ef7d'],
];

function avatarGrad(seed: number): [string, string] {
  return GRADIENT_POOL[seed % GRADIENT_POOL.length];
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0] ?? '').join('').toUpperCase().slice(0, 2);
}

// ─── Live pulse ring ──────────────────────────────────────────────────────────

function PulseRing() {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0.4, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1, false
    );
  }, []);
  const s = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View style={[stS.liveRingAnim, s]}>
      <LinearGradient colors={['#FF2D87', '#FF6B35']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
    </Animated.View>
  );
}

// ─── Status / live bubble ─────────────────────────────────────────────────────

function StatusBubble({ item, C }: { item: StatusItem; C: AppColors }) {
  const [seen, setSeen] = useState(item.seen ?? false);
  const g = avatarGrad(item.gradSeed);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSeen(true);
    if (item.isLive) router.push('/(tabs)/discover');
  };

  return (
    <TouchableOpacity style={stS.bubble} activeOpacity={0.8} onPress={handlePress}>
      {/* Ring + avatar */}
      <View style={stS.ringWrap}>
        {item.isLive ? (
          <Animated.View style={[stS.liveRingAnim, StyleSheet.absoluteFill]}>
            <LinearGradient colors={['#FF2D87', '#FF6B35']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          </Animated.View>
        ) : (
          <LinearGradient
            colors={seen ? [C.border, C.border] : [g[0], g[1]]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          />
        )}
        <View style={[stS.avatarOuter, { backgroundColor: C.bg }]}>
          <LinearGradient colors={g} style={stS.avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={stS.avatarText}>{initials(item.name)}</Text>
          </LinearGradient>
        </View>
        {item.isLive && (
          <View style={stS.livePill}>
            <Text style={stS.livePillText}>LIVE</Text>
          </View>
        )}
      </View>

      {/* Name */}
      <Text style={[stS.name, { color: C.textPrimary }]} numberOfLines={1}>
        {item.name.split(' ')[0]}
      </Text>

      {/* Status text — separate line, readable */}
      {item.status ? (
        <Text style={[stS.statusLine, { color: C.textMuted }]} numberOfLines={2}>
          {item.status}
        </Text>
      ) : (
        <Text style={[stS.statusLine, { color: C.pink }]}>Live now</Text>
      )}
    </TouchableOpacity>
  );
}

const stS = StyleSheet.create({
  bubble: { alignItems: 'center', width: 76, gap: 5 },
  ringWrap: {
    width: 64, height: 64, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', padding: 3,
  },
  liveRingAnim: { borderRadius: 22, overflow: 'hidden' },
  avatarOuter: { width: 58, height: 58, borderRadius: 19, alignItems: 'center', justifyContent: 'center', padding: 2.5 },
  avatar: { width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Syne-Bold', fontSize: 17, color: '#FFFFFF' },
  livePill: { position: 'absolute', bottom: 1, alignSelf: 'center', backgroundColor: '#FF2D87', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 },
  livePillText: { fontFamily: 'DMSans-Bold', fontSize: 8, color: '#FFFFFF', letterSpacing: 0.5 },
  name: { fontFamily: 'DMSans-Bold', fontSize: 12, textAlign: 'center' },
  statusLine: { fontFamily: 'DMSans-Regular', fontSize: 11, textAlign: 'center', lineHeight: 14 },
});

// ─── Activity icon ────────────────────────────────────────────────────────────

function activityConfig(type: ActivityType): { icon: string; bg: string; color: string } {
  switch (type) {
    case 'follow':  return { icon: 'person-add',    bg: '#7B2FFF22', color: '#7B2FFF' };
    case 'like':    return { icon: 'heart',         bg: '#FF2D8722', color: '#FF2D87' };
    case 'comment': return { icon: 'chatbubble',    bg: '#0094FF22', color: '#0094FF' };
    case 'gift':    return { icon: 'gift',          bg: '#FFD70022', color: '#FFD700' };
    case 'live':    return { icon: 'radio',         bg: '#FF2D8722', color: '#FF2D87' };
    case 'mention': return { icon: 'at',            bg: '#00D4AA22', color: '#00D4AA' };
  }
}

// ─── Activity row ─────────────────────────────────────────────────────────────

function ActivityRow({ item, index, C }: { item: ActivityItem; index: number; C: AppColors }) {
  const [followed, setFollowed] = useState(false);
  const g = avatarGrad(item.gradSeed);
  const cfg = activityConfig(item.type);

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(320)}>
      <TouchableOpacity
        style={[actS.row, !item.read && { backgroundColor: C.pinkDim ?? C.bgCard }]}
        activeOpacity={0.75}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); if (item.actorId) router.push({ pathname: '/user/[id]', params: { id: item.actorId, name: item.actor, handle: item.actorHandle } } as any); markNotificationRead(item.id); }}
      >
        {/* Avatar + type badge */}
        <View style={actS.avatarWrap}>
          <LinearGradient colors={[g[0], g[1]]} style={actS.avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={actS.avatarText}>{initials(item.actor)}</Text>
          </LinearGradient>
          <View style={[actS.typeBadge, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon as any} size={9} color={cfg.color} />
          </View>
        </View>

        {/* Text */}
        <View style={actS.content}>
          <Text style={[actS.text, { color: C.textPrimary }]} numberOfLines={2}>
            <Text style={actS.textBold}>@{item.actorHandle} </Text>
            {item.text}
          </Text>
          <Text style={[actS.time, { color: C.textMuted }]}>{item.time} ago</Text>
        </View>

        {/* Action for follow */}
        {item.type === 'follow' && (
          <TouchableOpacity
            style={[actS.followBtn, followed && { borderColor: C.border }]}
            activeOpacity={0.75}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFollowed((v) => !v); }}
          >
            {!followed && (
              <LinearGradient colors={['#FF2D87', '#7B2FFF']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
            )}
            <Text style={[actS.followBtnText, { color: followed ? C.textSecondary : '#FFFFFF' }]}>
              {followed ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Unread dot */}
        {!item.read && <View style={[actS.unreadDot, { backgroundColor: C.pink }]} />}
      </TouchableOpacity>
    </Animated.View>
  );
}

const actS = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  avatarWrap: { position: 'relative', flexShrink: 0 },
  avatar: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Syne-Bold', fontSize: 15, color: '#FFFFFF' },
  typeBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  content: { flex: 1, gap: 2 },
  text: { fontFamily: 'DMSans-Regular', fontSize: 13, lineHeight: 18 },
  textBold: { fontFamily: 'DMSans-Bold' },
  time: { fontFamily: 'DMSans-Regular', fontSize: 11 },
  followBtn: {
    height: 32, borderRadius: 9, paddingHorizontal: 14,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', minWidth: 80,
    borderWidth: 1, borderColor: 'transparent',
  },
  followBtnText: { fontFamily: 'DMSans-Bold', fontSize: 12 },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    position: 'absolute', top: 12, right: 16,
  },
});

// ─── Chat row ─────────────────────────────────────────────────────────────────

function ChatRow({ chat, index, C }: { chat: ChatItem; index: number; C: AppColors }) {
  const g = avatarGrad(chat.gradSeed);
  return (
    <Animated.View entering={FadeInDown.delay(index * 45).duration(340)}>
      <TouchableOpacity
        style={chatS.row}
        activeOpacity={0.75}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/chat/${chat.id}` as any); }}
      >
        <View style={chatS.avatarWrap}>
          <LinearGradient colors={[g[0], g[1]]} style={chatS.avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={chatS.avatarText}>{initials(chat.name)}</Text>
          </LinearGradient>
          {chat.isLive && <View style={[chatS.liveDot, { borderColor: C.bg }]} />}
        </View>
        <View style={chatS.content}>
          <View style={chatS.contentTop}>
            <Text style={[chatS.name, { color: C.textPrimary }]} numberOfLines={1}>{chat.name}</Text>
            <Text style={[chatS.time, { color: C.textMuted }]}>{chat.time}</Text>
          </View>
          <View style={chatS.contentBottom}>
            <Text
              style={[chatS.lastMsg, { color: C.textMuted }, chat.unread > 0 && { color: C.textSecondary, fontFamily: 'DMSans-Medium' }]}
              numberOfLines={1}
            >
              {chat.lastMessage}
            </Text>
            {chat.unread > 0 && (
              <View style={[chatS.badge, { backgroundColor: C.pink }]}>
                <Text style={chatS.badgeText}>{chat.unread}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const chatS = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  avatarWrap: { position: 'relative', flexShrink: 0 },
  avatar: { width: 50, height: 50, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Syne-Bold', fontSize: 17, color: '#FFFFFF' },
  liveDot: { position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: 6, backgroundColor: '#FF2D87', borderWidth: 2 },
  content: { flex: 1, gap: 3 },
  contentTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  contentBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { fontFamily: 'DMSans-Bold', fontSize: 15, flex: 1 },
  time: { fontFamily: 'DMSans-Regular', fontSize: 12 },
  lastMsg: { fontFamily: 'DMSans-Regular', fontSize: 13, flex: 1 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { fontFamily: 'DMSans-Bold', fontSize: 11, color: '#FFFFFF' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [tab, setTab] = useState<'activity' | 'messages'>('activity');
  const [query, setQuery] = useState('');

  const [notifications, setNotifications] = useState<ActivityItem[]>([]);
  const [conversations, setConversations] = useState<ChatItem[]>([]);
  const [statuses, setStatuses] = useState<StatusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [notifs, convos, stats] = await Promise.all([
      getNotifications(),
      getConversations(),
      getFollowingStatuses(),
    ]);
    setNotifications(notifs.map(toActivityItem));
    setConversations(convos.map(toChatItem));
    setStatuses(stats.map(toStatusItem));
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const unreadActivity  = notifications.filter((a) => !a.read).length;
  const unreadMessages  = conversations.filter((c) => c.unread > 0).length;

  const filteredChats = query.trim()
    ? conversations.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : conversations;

  return (
    <View style={styles.container}>
      <View style={{ height: insets.top + 12 }} />

      {/* Status / live row — only shown when there's data */}
      {statuses.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.storiesRow}
          style={styles.storiesScroll}
        >
          {statuses.map((item) => (
            <StatusBubble key={item.id} item={item} C={C} />
          ))}
        </ScrollView>
      )}

      {/* Sub-tabs */}
      <View style={[styles.tabRow, { borderBottomColor: C.border }]}>
        {(['activity', 'messages'] as const).map((t) => {
          const active = tab === t;
          const badge = t === 'activity' ? unreadActivity : unreadMessages;
          return (
            <TouchableOpacity key={t} style={styles.tabBtn} activeOpacity={0.8}
              onPress={() => { Haptics.selectionAsync(); setTab(t); }}
            >
              <View style={styles.tabBtnInner}>
                <Text style={[styles.tabLabel, active && styles.tabLabelActive, { color: active ? C.textPrimary : C.textMuted }]}>
                  {t === 'activity' ? 'Activity' : 'Messages'}
                </Text>
                {badge > 0 && (
                  <View style={[styles.tabBadge, { backgroundColor: active ? C.pink : C.bgCard, borderColor: active ? 'transparent' : C.border }]}>
                    <Text style={[styles.tabBadgeText, { color: active ? '#FFFFFF' : C.textMuted }]}>{badge}</Text>
                  </View>
                )}
              </View>
              {active && <LinearGradient colors={['#FF2D87', '#7B2FFF']} style={styles.tabUnderline} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.pink} />
        </View>
      ) : tab === 'activity' ? (
        <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.pink} />}
        >
          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-outline" size={40} color={C.textMuted} />
              <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>No notifications yet</Text>
              <Text style={[styles.emptySub, { color: C.textMuted }]}>When people follow, like, or comment you'll see it here.</Text>
            </View>
          ) : (
            notifications.map((item, i) => (
              <View key={item.id}>
                <ActivityRow item={item} index={i} C={C} />
                {i < notifications.length - 1 && <View style={[styles.divider, { backgroundColor: C.border }]} />}
              </View>
            ))
          )}
        </ScrollView>
      ) : (
        <>
          <View style={styles.searchWrap}>
            <View style={[styles.searchBar, { backgroundColor: C.bgCard, borderColor: C.border }]}>
              <Ionicons name="search-outline" size={15} color={C.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: C.textPrimary }]}
                placeholder="Search messages"
                placeholderTextColor={C.textMuted}
                value={query}
                onChangeText={setQuery}
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')} activeOpacity={0.7}>
                  <Ionicons name="close-circle" size={15} color={C.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>
          <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.pink} />}
          >
            {filteredChats.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubble-outline" size={40} color={C.textMuted} />
                <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>No messages yet</Text>
                <Text style={[styles.emptySub, { color: C.textMuted }]}>Find a creator and send them a message!</Text>
              </View>
            ) : (
              filteredChats.map((chat, i) => (
                <View key={chat.id}>
                  <ChatRow chat={chat} index={i} C={C} />
                  {i < filteredChats.length - 1 && <View style={[styles.divider, { backgroundColor: C.border, marginLeft: 78 }]} />}
                </View>
              ))
            )}
          </ScrollView>
        </>
      )}
    </View>
  );
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 10 },
    storiesScroll: { flexGrow: 0 },
    storiesRow: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20, gap: 20 },
    title: { fontFamily: 'Syne-ExtraBold', fontSize: 26, color: C.textPrimary },
    titleBadge: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
    titleBadgeText: { fontFamily: 'DMSans-Bold', fontSize: 12, color: '#FFFFFF' },
    tabRow: {
      flexDirection: 'row', borderBottomWidth: 1,
      paddingHorizontal: 16,
    },
    tabBtn: { flex: 1, alignItems: 'center', paddingBottom: 0 },
    tabBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10 },
    tabLabel: { fontFamily: 'DMSans-Medium', fontSize: 15 },
    tabLabelActive: { fontFamily: 'DMSans-Bold' },
    tabBadge: {
      minWidth: 18, height: 18, borderRadius: 9, borderWidth: 1,
      alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    },
    tabBadgeText: { fontFamily: 'DMSans-Bold', fontSize: 10 },
    tabUnderline: { height: 2.5, width: '60%', borderRadius: 2 },
    searchWrap: { paddingHorizontal: 16, paddingVertical: 10 },
    searchBar: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9,
    },
    searchInput: { flex: 1, fontFamily: 'DMSans-Regular', fontSize: 14, padding: 0 },
    onlineScroll: { flexGrow: 0 },
    onlineContent: { paddingHorizontal: 16, gap: 12, paddingBottom: 10 },
    onlineBubble: { alignItems: 'center', gap: 5, width: 56 },
    onlineRing: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', padding: 2, overflow: 'hidden' },
    onlineAvatar: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    onlineText: { fontFamily: 'Syne-Bold', fontSize: 15, color: '#FFFFFF' },
    onlineName: { fontFamily: 'DMSans-Medium', fontSize: 11, maxWidth: 56, textAlign: 'center' },
    scroll: { flex: 1 },
    divider: { height: 1 },
    emptyState: { alignItems: 'center', paddingTop: 72, gap: 10, paddingHorizontal: 32 },
    emptyTitle: { fontFamily: 'Syne-Bold', fontSize: 17 },
    emptySub: { fontFamily: 'DMSans-Regular', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  });
}
