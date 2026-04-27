import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { getConversations, type ConversationPreview } from '@/lib/messages';
import type { AppColors } from '@/constants/themes';

const { width: W } = Dimensions.get('window');

const GRADIENT_POOL: [string, string, string][] = [
  ['#FF2D87', '#C020E0', '#7B2FFF'],
  ['#FF6B35', '#FF2D87', '#C020E0'],
  ['#00D4AA', '#0094FF', '#7B2FFF'],
  ['#FFD700', '#FF6B35', '#FF2D87'],
  ['#00C9FF', '#92FE9D', '#00D4AA'],
  ['#FC466B', '#3F5EFB', '#7B2FFF'],
  ['#f7971e', '#ffd200', '#FF6B35'],
  ['#11998e', '#38ef7d', '#00D4AA'],
];

function avatarGrad(id: string): [string, string, string] {
  return GRADIENT_POOL[id.charCodeAt(0) % GRADIENT_POOL.length];
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0] ?? '').join('').toUpperCase().slice(0, 2) || '??';
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface ChatItem {
  id: string;
  otherUserId: string;
  name: string;
  handle: string;
  lastMessage: string;
  time: string;
  unread: number;
  isLive: boolean;
}

function previewToItem(p: ConversationPreview): ChatItem {
  return {
    id: p.conversation_id,
    otherUserId: p.other_user_id,
    name: p.other_name || p.other_handle || 'User',
    handle: p.other_handle ? `@${p.other_handle.replace(/^@/, '')}` : '',
    lastMessage: p.last_message ?? '',
    time: p.last_message_at ? timeAgo(p.last_message_at) : '',
    unread: p.has_unread ? 1 : 0,
    isLive: p.other_is_live,
  };
}

function ChatRow({ chat, index, C }: { chat: ChatItem; index: number; C: AppColors }) {
  const grad = avatarGrad(chat.otherUserId || chat.id);
  const styles = useMemo(() => makeRowStyles(C), [C]);

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(350)}>
      <TouchableOpacity
        activeOpacity={0.75}
        style={styles.row}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push({ pathname: '/chat/[id]', params: { id: chat.otherUserId, name: chat.name, handle: chat.handle } } as any);
        }}
      >
        <View style={styles.avatarWrap}>
          <LinearGradient colors={grad} style={styles.avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.avatarText}>{initials(chat.name)}</Text>
          </LinearGradient>
          {chat.isLive && <View style={styles.liveDot} />}
        </View>

        <View style={styles.content}>
          <View style={styles.contentTop}>
            <Text style={styles.name} numberOfLines={1}>{chat.name}</Text>
            <Text style={styles.time}>{chat.time}</Text>
          </View>
          <View style={styles.contentBottom}>
            <Text
              style={[styles.lastMsg, chat.unread > 0 && styles.lastMsgUnread]}
              numberOfLines={1}
            >
              {chat.lastMessage || 'No messages yet'}
            </Text>
            {chat.unread > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{chat.unread}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function makeRowStyles(C: AppColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 16, paddingVertical: 13,
    },
    avatarWrap: { position: 'relative', flexShrink: 0 },
    avatar: { width: 50, height: 50, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontFamily: 'Syne-Bold', fontSize: 17, color: '#FFFFFF' },
    liveDot: {
      position: 'absolute', bottom: 1, right: 1,
      width: 12, height: 12, borderRadius: 6,
      backgroundColor: '#FF2D87', borderWidth: 2, borderColor: C.bg,
    },
    content: { flex: 1, gap: 3 },
    contentTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    contentBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    name: { fontFamily: 'DMSans-Bold', fontSize: 15, color: C.textPrimary, flex: 1 },
    time: { fontFamily: 'DMSans-Regular', fontSize: 12, color: C.textMuted },
    lastMsg: { fontFamily: 'DMSans-Regular', fontSize: 13, color: C.textMuted, flex: 1 },
    lastMsgUnread: { fontFamily: 'DMSans-Medium', color: C.textSecondary },
    unreadBadge: {
      minWidth: 20, height: 20, borderRadius: 10,
      backgroundColor: C.pink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
    },
    unreadText: { fontFamily: 'DMSans-Bold', fontSize: 11, color: '#FFFFFF' },
  });
}

export default function ChatsScreen() {
  const insets = useSafeAreaInsets();
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [query, setQuery] = useState('');
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getConversations().then((previews) => {
      setChats(previews.map(previewToItem));
      setLoading(false);
    });
  }, []);

  const filtered = query.trim()
    ? chats.filter((c) =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.handle.toLowerCase().includes(query.toLowerCase())
      )
    : chats;

  const totalUnread = chats.reduce((s, c) => s + c.unread, 0);
  const liveChats = chats.filter((c) => c.isLive);

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View
        entering={FadeInDown.delay(0).duration(400)}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerTop}>
          <Text style={styles.title}>Messages</Text>
          {totalUnread > 0 && (
            <View style={styles.titleBadge}>
              <Text style={styles.titleBadgeText}>{totalUnread}</Text>
            </View>
          )}
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={styles.newChatBtn} activeOpacity={0.7}>
            <Ionicons name="create-outline" size={20} color={C.pink} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color={C.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search messages"
            placeholderTextColor={C.textMuted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={16} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Active now (live contacts) */}
      {!query && liveChats.length > 0 && (
        <Animated.View entering={FadeInDown.delay(80).duration(400)}>
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activeContent}
            style={styles.activeScroll}
          >
            {liveChats.map((c) => {
              const grad = avatarGrad(c.otherUserId || c.id);
              return (
                <TouchableOpacity
                  key={c.id}
                  style={styles.activeBubble}
                  activeOpacity={0.8}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push({ pathname: '/chat/[id]', params: { id: c.otherUserId, name: c.name, handle: c.handle } } as any);
                  }}
                >
                  <View style={styles.activeBubbleRing}>
                    <LinearGradient colors={['#FF2D87', '#7B2FFF']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                    <LinearGradient colors={grad} style={styles.activeBubbleAvatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                      <Text style={styles.activeBubbleText}>{initials(c.name)}</Text>
                    </LinearGradient>
                  </View>
                  <Text style={[styles.activeBubbleName, { color: C.textSecondary }]} numberOfLines={1}>
                    {c.name.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>
      )}

      {/* Divider label */}
      <View style={styles.sectionLabel}>
        <Text style={[styles.sectionLabelText, { color: C.textMuted }]}>
          {query ? `Results for "${query}"` : 'All messages'}
        </Text>
      </View>

      {/* Chat list */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={C.pink} size="large" />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={44} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>
              {query ? 'No results' : 'No messages yet'}
            </Text>
            <Text style={[styles.emptySub, { color: C.textMuted }]}>
              {query ? 'Try a different search.' : 'Follow creators and start a conversation!'}
            </Text>
          </View>
        ) : (
          filtered.map((chat, i) => (
            <View key={chat.id}>
              <ChatRow chat={chat} index={i} C={C} />
              {i < filtered.length - 1 && (
                <View style={[styles.divider, { backgroundColor: C.border }]} />
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: { paddingHorizontal: 16, paddingBottom: 8, gap: 12 },
    headerTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { fontFamily: 'Syne-ExtraBold', fontSize: 26, color: C.textPrimary },
    titleBadge: {
      backgroundColor: C.pink, borderRadius: 10,
      minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
    },
    titleBadgeText: { fontFamily: 'DMSans-Bold', fontSize: 12, color: '#FFFFFF' },
    newChatBtn: {
      width: 40, height: 40, borderRadius: 12,
      backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border,
      alignItems: 'center', justifyContent: 'center',
    },
    searchBar: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: C.bgCard, borderRadius: 14, borderWidth: 1, borderColor: C.border,
      paddingHorizontal: 12, paddingVertical: 10,
    },
    searchInput: {
      flex: 1, fontFamily: 'DMSans-Regular', fontSize: 14, color: C.textPrimary, padding: 0,
    },
    activeScroll: { flexGrow: 0 },
    activeContent: { paddingHorizontal: 16, gap: 14, paddingVertical: 8 },
    activeBubble: { alignItems: 'center', gap: 5, width: 58 },
    activeBubbleRing: {
      width: 56, height: 56, borderRadius: 19,
      alignItems: 'center', justifyContent: 'center', padding: 2,
    },
    activeBubbleAvatar: { width: 50, height: 50, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
    activeBubbleText: { fontFamily: 'Syne-Bold', fontSize: 16, color: '#FFFFFF' },
    activeBubbleName: { fontFamily: 'DMSans-Medium', fontSize: 11, maxWidth: 58, textAlign: 'center' },
    sectionLabel: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4 },
    sectionLabelText: { fontFamily: 'DMSans-Medium', fontSize: 12, letterSpacing: 0.3 },
    list: { flex: 1 },
    loadingWrap: { paddingVertical: 60, alignItems: 'center' },
    divider: { height: 1, marginLeft: 78 },
    empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
    emptyTitle: { fontFamily: 'Syne-Bold', fontSize: 16 },
    emptySub: { fontFamily: 'DMSans-Regular', fontSize: 13, textAlign: 'center', maxWidth: 220 },
  });
}
