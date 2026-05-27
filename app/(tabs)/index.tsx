import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Modal,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ViewToken,
  GestureResponderEvent,
  useWindowDimensions,
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
  withSpring,
  withDelay,
  FadeIn,
  FadeInUp,
  FadeInDown,
} from 'react-native-reanimated';
import { VideoView, useVideoPlayer } from 'expo-video';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/themes';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { getPlatform } from '@/constants/platforms';
import { trackEngagement } from '@/lib/feed';
import { GIFT_CATALOG, sendGift, type GiftItem } from '@/lib/gifts';
import {
  getThreadFeed,
  postThread as dbPostThread,
  postThreadReply as dbPostReply,
  toggleThreadLike,
  toggleThreadRepost,
  toggleThreadBookmark,
  type Thread as DbThread,
} from '@/lib/threads';

const { width: W, height: SCREEN_H } = Dimensions.get('screen');

// ─── Thread types ──────────────────────────────────────────────────────────────

interface ThreadReply {
  id: string;
  user: string;
  handle: string;
  text: string;
  time: string;
  likes: number;
  gradSeed: number;
  liked?: boolean;
}

interface ThreadPost {
  id: string;
  threadId?: string; // real DB id for interactions
  user: string;
  handle: string;
  text: string;
  time: string;
  likes: number;
  comments: number;
  reposts: number;
  gradSeed: number;
  liked?: boolean;
  reposted?: boolean;
  bookmarked?: boolean;
  hasReply?: boolean;
  replies?: ThreadReply[];
  tags?: string[];
  media?: string | null;
}

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)   return `${Math.floor(diff)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function dbThreadToPost(t: DbThread, idx: number): ThreadPost {
  return {
    id: t.id,
    threadId: t.id,
    user: t.display_name,
    handle: t.handle.startsWith('@') ? t.handle : `@${t.handle}`,
    text: t.body,
    time: relativeTime(t.created_at),
    likes: t.likes,
    comments: t.replies,
    reposts: t.reposts,
    gradSeed: Math.abs((t.user_id.charCodeAt(0) || 0) + idx) % 8,
    liked: t.liked ?? false,
    reposted: t.reposted ?? false,
    bookmarked: t.bookmarked ?? false,
    tags: t.tags ?? [],
    hasReply: false,
    replies: [],
  };
}


interface Creator {
  id: string;
  handle: string;
  display_name: string;
  total_viewers: number;
  platforms: string[] | null;
  is_live: boolean;
  last_streamed_at: string | null;
  stream_count: number;
}

interface VideoItem {
  id: string;
  creator: Creator;
  caption: string;
  mediaUrl: string | null;
  views: number;
  likes: number;
  comments: number;
  accentColor: string;
}

const ACCENT_COLORS = [
  '#FF2D87', '#7B2FFF', '#00D4AA', '#FF6B35',
  '#3F5EFB', '#f7971e', '#11998e', '#FC466B',
];

function initials(name: string) {
  return name.split(' ').map((w) => w[0] ?? '').join('').toUpperCase().slice(0, 2) || '??';
}

// ─── Pulse dot ────────────────────────────────────────────────────────────────

function PulseDot({ size = 7, color = '#FF2D87' }: { size?: number; color?: string }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(withSequence(withTiming(1.7, { duration: 700 }), withTiming(1, { duration: 700 })), -1);
    opacity.value = withRepeat(withSequence(withTiming(0.3, { duration: 700 }), withTiming(1, { duration: 700 })), -1);
  }, []);
  const s = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }));
  return <Animated.View style={[s, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]} />;
}

// ─── Spinning vinyl disc ──────────────────────────────────────────────────────

function SpinningDisc({ color }: { color: string }) {
  const rotate = useSharedValue(0);
  useEffect(() => {
    rotate.value = withRepeat(withTiming(360, { duration: 3000 }), -1, false);
  }, []);
  const s = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotate.value}deg` }] }));
  return (
    <Animated.View style={[s, discS.disc, { borderColor: color + '60' }]}>
      <View style={[discS.center, { backgroundColor: color }]} />
    </Animated.View>
  );
}
const discS = StyleSheet.create({
  disc: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  center: { width: 8, height: 8, borderRadius: 4 },
});

// ─── Comments sheet ───────────────────────────────────────────────────────────

interface CommentData {
  id: string; user: string; handle: string; text: string;
  likes: number; time: string; gradSeed: number; liked?: boolean;
}

const MOCK_COMMENTS: CommentData[] = [
  { id: '1', user: 'Alex Rivera',   handle: 'alexr',    text: 'This is absolutely insane 🔥🔥🔥 been waiting for this',      likes: 423, time: '2h',  gradSeed: 0 },
  { id: '2', user: 'Maya Chen',     handle: 'mayac',    text: 'Been waiting for this drop 👀 finally!!',                       likes: 187, time: '45m', gradSeed: 1 },
  { id: '3', user: 'Jordan Miles',  handle: 'jmiles',   text: 'The energy in this one is unmatched',                            likes: 94,  time: '1h',  gradSeed: 2 },
  { id: '4', user: 'Priya Sharma',  handle: 'priyas',   text: 'omg I found my new fav creator 💜💜',                             likes: 561, time: '3h',  gradSeed: 3 },
  { id: '5', user: 'Tyler Knox',    handle: 'tknox',    text: 'replay button is broken rn 😭',                                  likes: 302, time: '30m', gradSeed: 4 },
  { id: '6', user: 'Sofia Diaz',    handle: 'sofiad',   text: 'The part at 0:28 had me on the floor 💀',                        likes: 148, time: '5h',  gradSeed: 5 },
  { id: '7', user: 'Kai Thompson',  handle: 'kait',     text: 'came from tiktok and I\'m staying here forever',                 likes: 77,  time: '8h',  gradSeed: 6 },
  { id: '8', user: 'Nadia Hassan',  handle: 'nadiah',   text: 'literally screaming rn the talent 🎤',                           likes: 230, time: '12h', gradSeed: 7 },
];

const COMMENT_GRADS: [string, string][] = [
  ['#FF2D87','#C020E0'],['#7B2FFF','#3F5EFB'],['#FF6B35','#FF2D87'],['#00D4AA','#0094FF'],
  ['#f7971e','#ffd200'],['#FC466B','#3F5EFB'],['#11998e','#38ef7d'],['#FFD700','#FF6B35'],
];

function CommentsSheet({ visible, onClose, item, C, insets }: {
  visible: boolean; onClose: () => void; item: VideoItem | null; C: AppColors; insets: { bottom: number };
}) {
  const [comments, setComments] = useState(MOCK_COMMENTS);
  const [text, setText] = useState('');

  const handleSend = () => {
    if (!text.trim()) return;
    const newComment: CommentData = {
      id: String(Date.now()), user: 'You', handle: 'you', text: text.trim(),
      likes: 0, time: 'now', gradSeed: 2,
    };
    setComments((prev) => [newComment, ...prev]);
    setText('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleLike = (id: string) => {
    setComments((prev) => prev.map((c) => c.id === id ? { ...c, liked: !c.liked, likes: c.liked ? c.likes - 1 : c.likes + 1 } : c));
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={cmtS.backdrop} activeOpacity={1} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={cmtS.kav}>
        <View style={[cmtS.sheet, { backgroundColor: C.bgDeep, borderColor: C.border, paddingBottom: insets.bottom + 8 }]}>
          <View style={[cmtS.handle, { backgroundColor: C.border }]} />
          <View style={[cmtS.header, { borderBottomColor: C.border }]}>
            <Text style={[cmtS.headerTitle, { color: C.textPrimary }]}>
              {item ? `${(item.comments + comments.filter(c => c.id.startsWith(String(Date.now()).slice(0,-3))).length).toLocaleString()} comments` : 'Comments'}
            </Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={cmtS.list}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {comments.map((c, i) => {
              const [g1, g2] = COMMENT_GRADS[c.gradSeed % COMMENT_GRADS.length];
              return (
                <Animated.View key={c.id} entering={FadeInDown.delay(i * 30).duration(280)} style={cmtS.commentRow}>
                  <LinearGradient colors={[g1, g2]} style={cmtS.cmtAvatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <Text style={cmtS.cmtAvatarText}>{initials(c.user)}</Text>
                  </LinearGradient>
                  <View style={cmtS.cmtBody}>
                    <View style={cmtS.cmtTop}>
                      <Text style={[cmtS.cmtUser, { color: C.textPrimary }]}>{c.user}</Text>
                      <Text style={[cmtS.cmtTime, { color: C.textMuted }]}>{c.time}</Text>
                    </View>
                    <Text style={[cmtS.cmtText, { color: C.textSecondary }]}>{c.text}</Text>
                    <TouchableOpacity activeOpacity={0.7}>
                      <Text style={[cmtS.cmtReply, { color: C.textMuted }]}>Reply</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={cmtS.cmtLike} activeOpacity={0.7} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleLike(c.id); }}>
                    <Ionicons name={c.liked ? 'heart' : 'heart-outline'} size={16} color={c.liked ? '#FF2D87' : C.textMuted} />
                    <Text style={[cmtS.cmtLikeCount, { color: c.liked ? '#FF2D87' : C.textMuted }]}>{c.likes}</Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </ScrollView>

          <View style={[cmtS.inputRow, { borderTopColor: C.border }]}>
            <TextInput
              style={[cmtS.input, { backgroundColor: C.bgCard, color: C.textPrimary, borderColor: C.border }]}
              placeholder="Add a comment…"
              placeholderTextColor={C.textMuted}
              value={text}
              onChangeText={setText}
              multiline={false}
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity onPress={handleSend} activeOpacity={0.7} style={[cmtS.sendBtn, { backgroundColor: text.trim() ? '#FF2D87' : C.bgCard }]}>
              <Ionicons name="send" size={16} color={text.trim() ? '#FFFFFF' : C.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const cmtS = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'transparent' },
  kav: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, maxHeight: SCREEN_H * 0.75, overflow: 'hidden' },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitle: { fontFamily: 'Syne-Bold', fontSize: 16 },
  list: { maxHeight: SCREEN_H * 0.5, paddingHorizontal: 16 },
  commentRow: { flexDirection: 'row', paddingVertical: 12, gap: 10, alignItems: 'flex-start' },
  cmtAvatar: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cmtAvatarText: { fontFamily: 'Syne-Bold', fontSize: 12, color: '#FFFFFF' },
  cmtBody: { flex: 1, gap: 3 },
  cmtTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cmtUser: { fontFamily: 'DMSans-Bold', fontSize: 13 },
  cmtTime: { fontFamily: 'DMSans-Regular', fontSize: 11 },
  cmtText: { fontFamily: 'DMSans-Regular', fontSize: 13, lineHeight: 18 },
  cmtReply: { fontFamily: 'DMSans-Medium', fontSize: 12, marginTop: 2 },
  cmtLike: { alignItems: 'center', gap: 2, paddingLeft: 8 },
  cmtLikeCount: { fontFamily: 'DMSans-Medium', fontSize: 10 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontFamily: 'DMSans-Regular', fontSize: 14 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});

// ─── Share sheet ──────────────────────────────────────────────────────────────

const SHARE_FRIENDS = [
  { id: 'f0', name: 'Alex R.',    gradSeed: 0 },
  { id: 'f1', name: 'Maya C.',    gradSeed: 1 },
  { id: 'f2', name: 'Jordan',     gradSeed: 2 },
  { id: 'f3', name: 'Priya S.',   gradSeed: 3 },
  { id: 'f4', name: 'Tyler K.',   gradSeed: 4 },
];

const SHARE_ACTIONS = [
  { id: 'copy',    icon: 'link-outline',         label: 'Copy link',    color: '#7B2FFF' },
  { id: 'dm',      icon: 'paper-plane-outline',  label: 'Send in DM',   color: '#00D4AA' },
  { id: 'save',    icon: 'download-outline',     label: 'Save video',   color: '#FF6B35' },
  { id: 'report',  icon: 'flag-outline',         label: 'Report',       color: '#FF2D87' },
  { id: 'notint',  icon: 'eye-off-outline',      label: 'Not interested', color: '#666' },
];

const SHARE_PLATFORMS = [
  { id: 'tiktok',    icon: 'tiktok',     label: 'TikTok',    grad: ['#010101','#69C9D0'] as [string,string] },
  { id: 'instagram', icon: 'instagram',  label: 'Instagram', grad: ['#f09433','#dc2743'] as [string,string] },
  { id: 'whatsapp',  icon: 'whatsapp',   label: 'WhatsApp',  grad: ['#25D366','#128C7E'] as [string,string] },
  { id: 'twitter',   icon: 'twitter',    label: 'Twitter',   grad: ['#1DA1F2','#0d8ecf'] as [string,string] },
  { id: 'facebook',  icon: 'facebook',   label: 'Facebook',  grad: ['#1877F2','#166FE5'] as [string,string] },
];

function ShareSheet({ visible, onClose, C, insets }: {
  visible: boolean; onClose: () => void; C: AppColors; insets: { bottom: number };
}) {
  const [copied, setCopied] = useState(false);

  const handleAction = (id: string) => {
    if (id === 'copy') {
      setCopied(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => { setCopied(false); onClose(); }, 1200);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={shrS.backdrop} activeOpacity={1} onPress={onClose} />
      <Animated.View entering={FadeInUp.duration(280).springify()} style={[shrS.sheet, { backgroundColor: C.bgDeep, borderColor: C.border, paddingBottom: insets.bottom + 12 }]}>
        <View style={[shrS.handle, { backgroundColor: C.border }]} />
        <Text style={[shrS.title, { color: C.textPrimary }]}>Share to</Text>

        {/* Friend bubbles */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={shrS.friendsRow}>
          {SHARE_FRIENDS.map((f) => {
            const [g1, g2] = COMMENT_GRADS[f.gradSeed];
            return (
              <TouchableOpacity key={f.id} style={shrS.friendBubble} activeOpacity={0.8} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onClose(); }}>
                <LinearGradient colors={[g1, g2]} style={shrS.friendAvatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Text style={shrS.friendInitials}>{initials(f.name)}</Text>
                </LinearGradient>
                <Text style={[shrS.friendName, { color: C.textSecondary }]}>{f.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Platforms */}
        <View style={[shrS.divider, { backgroundColor: C.border }]} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={shrS.platformsRow}>
          {SHARE_PLATFORMS.map((p) => (
            <TouchableOpacity key={p.id} style={shrS.friendBubble} activeOpacity={0.8} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onClose(); }}>
              <LinearGradient colors={p.grad} style={shrS.friendAvatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <FontAwesome5 name={p.icon} size={18} color="#FFFFFF" solid />
              </LinearGradient>
              <Text style={[shrS.friendName, { color: C.textSecondary }]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Actions */}
        <View style={[shrS.divider, { backgroundColor: C.border }]} />
        <View style={shrS.actionsGrid}>
          {SHARE_ACTIONS.map((a) => (
            <TouchableOpacity key={a.id} style={[shrS.actionRow, { borderColor: C.border, backgroundColor: C.bgCard }]} activeOpacity={0.75} onPress={() => handleAction(a.id)}>
              <View style={[shrS.actionIcon, { backgroundColor: a.color + '22' }]}>
                <Ionicons name={a.icon as any} size={18} color={a.color} />
              </View>
              <Text style={[shrS.actionLabel, { color: a.id === 'copy' && copied ? '#00D4AA' : C.textPrimary }]}>
                {a.id === 'copy' && copied ? '✓ Copied!' : a.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </Modal>
  );
}

const shrS = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, paddingTop: 0 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  title: { fontFamily: 'Syne-Bold', fontSize: 16, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 },
  friendsRow: { paddingHorizontal: 16, gap: 16, paddingBottom: 16 },
  friendBubble: { alignItems: 'center', gap: 6, width: 60 },
  friendAvatar: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  friendInitials: { fontFamily: 'Syne-Bold', fontSize: 15, color: '#FFFFFF' },
  friendName: { fontFamily: 'DMSans-Regular', fontSize: 11, textAlign: 'center' },
  platformsRow: { paddingHorizontal: 16, gap: 16, paddingBottom: 16 },
  divider: { height: 1, marginHorizontal: 16, marginVertical: 4 },
  actionsGrid: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1 },
  actionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontFamily: 'DMSans-Medium', fontSize: 14 },
});

// ─── Gift sheet ───────────────────────────────────────────────────────────────

const GIFT_GRADS: Record<string, [string, string]> = {
  heart:   ['#FF2D87', '#FF6B9D'],
  rose:    ['#FF6B6B', '#FF2D87'],
  star:    ['#FFD700', '#FF9500'],
  fire:    ['#FF6B35', '#FF2D87'],
  diamond: ['#00D4FF', '#7B2FFF'],
  crown:   ['#FFD700', '#FF6B35'],
  rocket:  ['#7B2FFF', '#FF2D87'],
  galaxy:  ['#0094FF', '#7B2FFF'],
};

function GiftSheet({ visible, onClose, recipientId, recipientName, C, insets }: {
  visible: boolean;
  onClose: () => void;
  recipientId: string;
  recipientName: string;
  C: AppColors;
  insets: { bottom: number };
}) {
  const { tokenBalance, spendTokens } = useApp();
  const [sending, setSending] = useState<string | null>(null);
  const [lastSent, setLastSent] = useState<string | null>(null);

  const handleGift = async (gift: GiftItem) => {
    if (tokenBalance < gift.costTokens) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setSending(gift.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const ok = await sendGift({
      streamSessionId: null,
      recipientId,
      giftId: gift.id,
      quantity: 1,
      spendTokensFn: spendTokens,
    });
    setSending(null);
    if (ok) {
      setLastSent(gift.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => { setLastSent(null); onClose(); }, 900);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={gftS.backdrop} activeOpacity={1} onPress={onClose} />
      <Animated.View entering={FadeInUp.duration(280).springify()} style={[gftS.sheet, { backgroundColor: C.bgDeep, borderColor: C.border, paddingBottom: insets.bottom + 16 }]}>
        <View style={[gftS.handle, { backgroundColor: C.border }]} />

        {/* Header */}
        <View style={gftS.header}>
          <View>
            <Text style={[gftS.title, { color: C.textPrimary }]}>Send a gift</Text>
            <Text style={[gftS.sub, { color: C.textMuted }]}>to {recipientName}</Text>
          </View>
          <View style={[gftS.balancePill, { backgroundColor: C.bgCard, borderColor: C.border }]}>
            <Text style={gftS.balanceEmoji}>💎</Text>
            <Text style={[gftS.balanceText, { color: C.textPrimary }]}>{tokenBalance.toLocaleString()}</Text>
            <Text style={[gftS.balanceLabel, { color: C.textMuted }]}>tokens</Text>
          </View>
        </View>

        {/* Gift grid */}
        <View style={gftS.grid}>
          {GIFT_CATALOG.map((gift) => {
            const grad = GIFT_GRADS[gift.id] ?? ['#FF2D87', '#7B2FFF'];
            const canAfford = tokenBalance >= gift.costTokens;
            const isSending = sending === gift.id;
            const justSent = lastSent === gift.id;
            return (
              <TouchableOpacity
                key={gift.id}
                style={[gftS.giftCard, { backgroundColor: C.bgCard, borderColor: justSent ? grad[0] : C.border, opacity: canAfford ? 1 : 0.45 }]}
                activeOpacity={canAfford ? 0.75 : 1}
                onPress={() => canAfford && handleGift(gift)}
              >
                {justSent && (
                  <LinearGradient colors={[grad[0] + '30', grad[1] + '10']} style={StyleSheet.absoluteFill} />
                )}
                <Text style={gftS.giftEmoji}>{gift.emoji}</Text>
                <Text style={[gftS.giftName, { color: C.textSecondary }]}>{gift.name}</Text>
                <View style={[gftS.costRow, { backgroundColor: grad[0] + '22' }]}>
                  {isSending ? (
                    <ActivityIndicator size="small" color={grad[0]} />
                  ) : (
                    <Text style={[gftS.costText, { color: grad[0] }]}>
                      {justSent ? '✓ Sent!' : `${gift.costTokens} 💎`}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={gftS.getMore} activeOpacity={0.8} onPress={() => { onClose(); router.push('/viba-balance' as any); }}>
          <LinearGradient colors={['#FF2D87', '#7B2FFF']} style={gftS.getMoreGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={gftS.getMoreText}>Get more tokens</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const gftS = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  title: { fontFamily: 'Syne-Bold', fontSize: 17 },
  sub: { fontFamily: 'DMSans-Regular', fontSize: 13, marginTop: 2 },
  balancePill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  balanceEmoji: { fontSize: 14 },
  balanceText: { fontFamily: 'DMSans-Bold', fontSize: 14 },
  balanceLabel: { fontFamily: 'DMSans-Regular', fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10, justifyContent: 'center' },
  giftCard: { width: (W - 64) / 4, alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  giftEmoji: { fontSize: 28 },
  giftName: { fontFamily: 'DMSans-Medium', fontSize: 11 },
  costRow: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, minHeight: 22, alignItems: 'center', justifyContent: 'center' },
  costText: { fontFamily: 'DMSans-Bold', fontSize: 10 },
  getMore: { marginHorizontal: 20, marginTop: 16, borderRadius: 14, overflow: 'hidden' },
  getMoreGrad: { paddingVertical: 13, alignItems: 'center', borderRadius: 14 },
  getMoreText: { fontFamily: 'DMSans-Bold', fontSize: 14, color: '#FFFFFF' },
});

// ─── Single video item ────────────────────────────────────────────────────────

function VideoCard({
  item, isVisible, C, insets, onCommentPress, onSharePress, onGiftPress,
}: {
  item: VideoItem; isVisible: boolean; C: AppColors;
  insets: { top: number; bottom: number };
  onCommentPress: () => void;
  onSharePress: () => void;
  onGiftPress: () => void;
}) {
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [following, setFollowing] = useState(false);
  const [giftBurst, setGiftBurst] = useState<string | null>(null);
  const giftBurstOpacity = useSharedValue(0);
  const giftBurstY = useSharedValue(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [heartPos, setHeartPos] = useState({ x: W / 2, y: SCREEN_H / 3 });
  const likeScale = useSharedValue(1);
  const heartOpacity = useSharedValue(0);
  const heartScale = useSharedValue(0);
  const lastTapRef = useRef(0);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef(0);

  const videoUri = item.mediaUrl ?? '';

  const player = useVideoPlayer(videoUri, (p) => {
    p.loop = true;
    p.muted = false;
  });

  useEffect(() => {
    if (isVisible) {
      player.currentTime = 0;
      player.play();
    } else {
      player.pause();
      if (progressRef.current > 0) {
        const watchPct = Math.min(100, Math.round(progressRef.current * 100));
        trackEngagement(item.id, watchPct < 10 ? 'skip' : 'view', watchPct);
      }
      setProgress(0);
      progressRef.current = 0;
    }
  }, [isVisible, player]);

  useEffect(() => {
    const timeSub = player.addListener('timeUpdate', (payload: any) => {
      const dur = player.duration;
      if (dur > 0) {
        const p = Math.min(1, payload.currentTime / dur);
        setProgress(p);
        progressRef.current = p;
        if (p >= 1) trackEngagement(item.id, 'view', 100);
      }
    });
    const statusSub = player.addListener('statusChange', (payload: any) => {
      setIsLoading(payload.status === 'loading' || payload.status === 'idle');
    });
    const playingSub = player.addListener('playingChange', (payload: any) => {
      setIsPlaying(payload.isPlaying);
    });
    return () => { timeSub.remove(); statusSub.remove(); playingSub.remove(); };
  }, [player]);

  const likeStyle = useAnimatedStyle(() => ({ transform: [{ scale: likeScale.value }] }));
  const heartStyle = useAnimatedStyle(() => ({
    opacity: heartOpacity.value,
    transform: [{ scale: heartScale.value }],
  }));
  const giftBurstStyle = useAnimatedStyle(() => ({
    opacity: giftBurstOpacity.value,
    transform: [{ translateY: giftBurstY.value }],
  }));

  const triggerGiftBurst = (emoji: string) => {
    setGiftBurst(emoji);
    giftBurstY.value = 0;
    giftBurstOpacity.value = 1;
    giftBurstY.value = withTiming(-120, { duration: 900 });
    giftBurstOpacity.value = withSequence(
      withTiming(1, { duration: 50 }),
      withDelay(500, withTiming(0, { duration: 350 })),
    );
    setTimeout(() => setGiftBurst(null), 1000);
  };

  const triggerHeartBurst = () => {
    heartScale.value = 0.2;
    heartOpacity.value = 1;
    heartScale.value = withSpring(1.4, { damping: 5, stiffness: 200 });
    heartOpacity.value = withSequence(
      withTiming(1, { duration: 50 }),
      withDelay(400, withTiming(0, { duration: 350 }))
    );
  };

  const handlePress = (evt: GestureResponderEvent) => {
    const now = Date.now();
    const { locationX, locationY } = evt.nativeEvent;
    setHeartPos({ x: locationX, y: locationY });
    if (now - lastTapRef.current < 300) {
      lastTapRef.current = 0;
      if (singleTapTimer.current) { clearTimeout(singleTapTimer.current); singleTapTimer.current = null; }
      if (!liked) {
        setLiked(true);
        trackEngagement(item.id, 'like', Math.round(progressRef.current * 100));
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      triggerHeartBurst();
      likeScale.value = withSpring(1.4, { damping: 6 }, () => { likeScale.value = withSpring(1); });
    } else {
      lastTapRef.current = now;
      singleTapTimer.current = setTimeout(() => {
        singleTapTimer.current = null;
        if (player.playing) player.pause(); else player.play();
      }, 300);
    }
  };

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = !liked;
    setLiked(next);
    trackEngagement(item.id, next ? 'like' : 'view', Math.round(progressRef.current * 100));
    likeScale.value = withSpring(1.4, { damping: 6 }, () => { likeScale.value = withSpring(1); });
  };

  const fmtNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n);
  const platforms = (item.creator.platforms ?? []).slice(0, 3);

  return (
    <View style={{ width: W, height: SCREEN_H }}>
      {/* Video player */}
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handlePress}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0a0a14' }]} />
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
        />
        {/* Dark overlay */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.22)' }]} />

        {/* Loading spinner */}
        {isLoading && (
          <ActivityIndicator style={vidS.loadingSpinner} color="rgba(255,255,255,0.7)" size="large" />
        )}

        {/* Live badge */}
        {item.creator.is_live && (
          <View style={vidS.liveBadge}>
            <PulseDot size={6} color="#FFFFFF" />
            <Text style={vidS.liveBadgeText}>LIVE</Text>
          </View>
        )}

        {/* Pause indicator */}
        {!isPlaying && !isLoading && (
          <Animated.View entering={FadeIn.duration(120)} style={vidS.pauseIcon}>
            <Ionicons name="play" size={44} color="rgba(255,255,255,0.75)" />
          </Animated.View>
        )}

        {/* Bottom gradient */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.85)']}
          style={[StyleSheet.absoluteFill, { top: SCREEN_H * 0.42 }]}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        />

        {/* Double-tap heart burst */}
        <Animated.View
          style={[vidS.heartBurst, heartStyle, { left: heartPos.x - 40, top: heartPos.y - 40 }]}
          pointerEvents="none"
        >
          <Ionicons name="heart" size={80} color="#FF2D87" />
        </Animated.View>
      </TouchableOpacity>

      {/* ── Right actions ── */}
      <View style={[vidS.actions, { bottom: insets.bottom + 80 }]}>
        <TouchableOpacity
          style={vidS.avatarWrap}
          activeOpacity={0.85}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/user/${item.creator.id}` as any); }}
        >
          <LinearGradient
            colors={[item.accentColor, item.accentColor + 'AA']}
            style={vidS.avatar}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <Text style={vidS.avatarText}>{initials(item.creator.display_name || item.creator.handle)}</Text>
          </LinearGradient>
          <View style={[vidS.followDot, { backgroundColor: following ? '#00D4AA' : '#FF2D87' }]}>
            <Ionicons name={following ? 'checkmark' : 'add'} size={10} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={vidS.actionBtn} activeOpacity={0.7} onPress={handleLike}>
          <Animated.View style={likeStyle}>
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={32} color={liked ? '#FF2D87' : '#FFFFFF'} />
          </Animated.View>
          <Text style={vidS.actionCount}>{fmtNum(item.likes + (liked ? 1 : 0))}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={vidS.actionBtn} activeOpacity={0.7} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onCommentPress(); }}>
          <Ionicons name="chatbubble-ellipses-outline" size={30} color="#FFFFFF" />
          <Text style={vidS.actionCount}>{fmtNum(item.comments)}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={vidS.actionBtn}
          activeOpacity={0.7}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onGiftPress(); }}
        >
          <View style={vidS.giftBtn}>
            <LinearGradient colors={['#FF2D87', '#7B2FFF']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <Text style={vidS.giftBtnEmoji}>💎</Text>
          </View>
          <Text style={vidS.actionCount}>Gift</Text>
        </TouchableOpacity>

        <TouchableOpacity style={vidS.actionBtn} activeOpacity={0.7} onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          trackEngagement(item.id, 'share', Math.round(progressRef.current * 100));
          onSharePress();
        }}>
          <Ionicons name="paper-plane-outline" size={29} color="#FFFFFF" />
          <Text style={vidS.actionCount}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={vidS.actionBtn}
          activeOpacity={0.7}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const next = !bookmarked;
            setBookmarked(next);
            if (next) trackEngagement(item.id, 'save', Math.round(progressRef.current * 100));
          }}
        >
          <Ionicons name={bookmarked ? 'bookmark' : 'bookmark-outline'} size={29} color={bookmarked ? item.accentColor : '#FFFFFF'} />
        </TouchableOpacity>

        <SpinningDisc color={item.accentColor} />
      </View>

      {/* ── Bottom left info ── */}
      <View style={[vidS.info, { bottom: insets.bottom + 80 }]}>
        <TouchableOpacity
          style={vidS.creatorRow}
          activeOpacity={0.75}
          onPress={() => router.push(`/user/${item.creator.id}` as any)}
        >
          <Text style={vidS.creatorName}>
            {item.creator.display_name || item.creator.handle}
          </Text>
          {item.creator.is_live && <PulseDot size={6} color="#FF2D87" />}
        </TouchableOpacity>

        {platforms.length > 0 && (
          <View style={vidS.platformRow}>
            {platforms.map((p) => {
              try {
                const plat = getPlatform(p as any);
                return (
                  <View key={p} style={[vidS.platChip, { backgroundColor: plat.gradient[0] + '44' }]}>
                    <FontAwesome5 name={plat.icon} size={9} color={plat.gradient[0]} solid />
                  </View>
                );
              } catch { return null; }
            })}
          </View>
        )}

        {!!item.caption && (
          <Text style={vidS.caption} numberOfLines={2}>{item.caption}</Text>
        )}
      </View>

      {/* Progress bar */}
      <View style={vidS.progressTrack} pointerEvents="none">
        <View style={[vidS.progressFill, { width: `${(progress * 100).toFixed(1)}%` as any }]} />
      </View>

      {/* Floating gift burst */}
      {giftBurst && (
        <Animated.View style={[vidS.giftBurst, giftBurstStyle]} pointerEvents="none">
          <Text style={vidS.giftBurstEmoji}>{giftBurst}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const vidS = StyleSheet.create({
  liveBadge: { position: 'absolute', top: 64, left: 16, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FF2D87', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  liveBadgeText: { fontFamily: 'DMSans-Bold', fontSize: 11, color: '#FFFFFF', letterSpacing: 0.4 },
  pauseIcon: { position: 'absolute', top: '50%', left: '50%', marginTop: -28, marginLeft: -28 },
  loadingSpinner: { position: 'absolute', top: '50%', left: '50%', marginTop: -18, marginLeft: -18 },
  heartBurst: { position: 'absolute', width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  actions: { position: 'absolute', right: 12, alignItems: 'center', gap: 20 },
  avatarWrap: { position: 'relative', marginBottom: 6 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  avatarText: { fontFamily: 'Syne-Bold', fontSize: 14, color: '#FFFFFF' },
  followDot: { position: 'absolute', bottom: -6, alignSelf: 'center', width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#000' },
  actionBtn: { alignItems: 'center', gap: 4 },
  actionCount: { fontFamily: 'DMSans-Bold', fontSize: 12, color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  info: { position: 'absolute', left: 14, right: 88, gap: 7 },
  creatorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  creatorName: { fontFamily: 'DMSans-Bold', fontSize: 15, color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  verifiedBadge: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#FF2D87', alignItems: 'center', justifyContent: 'center' },
  platformRow: { flexDirection: 'row', gap: 5 },
  platChip: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  caption: { fontFamily: 'DMSans-Regular', fontSize: 13, color: '#FFFFFF', lineHeight: 18, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  musicRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  musicText: { fontFamily: 'DMSans-Medium', fontSize: 12, color: 'rgba(255,255,255,0.85)', flex: 1 },
  progressTrack: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2.5, backgroundColor: 'rgba(255,255,255,0.15)' },
  progressFill: { height: '100%', backgroundColor: '#FF2D87', borderRadius: 2 },
  giftBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  giftBtnEmoji: { fontSize: 18 },
  giftBurst: { position: 'absolute', bottom: '30%', alignSelf: 'center', alignItems: 'center' },
  giftBurstEmoji: { fontSize: 64 },
});

// ─── Threads feed ─────────────────────────────────────────────────────────────

const THREAD_GRADS: [string, string][] = [
  ['#FF2D87','#C020E0'],['#7B2FFF','#3F5EFB'],['#FF6B35','#FF2D87'],['#00D4AA','#0094FF'],
  ['#f7971e','#ffd200'],['#FC466B','#3F5EFB'],['#11998e','#38ef7d'],['#FFD700','#FF6B35'],
];

function fmtBig(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return String(n);
}

function ThreadAvatar({ name, gradSeed, size = 40 }: { name: string; gradSeed: number; size?: number }) {
  const [g1, g2] = THREAD_GRADS[gradSeed % THREAD_GRADS.length];
  return (
    <LinearGradient
      colors={[g1, g2]}
      style={{ width: size, height: size, borderRadius: size * 0.28, alignItems: 'center', justifyContent: 'center' }}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
    >
      <Text style={{ fontFamily: 'Syne-Bold', fontSize: size * 0.35, color: '#FFFFFF' }}>
        {initials(name)}
      </Text>
    </LinearGradient>
  );
}

function ThreadCard({ post, C, onReplyPress }: { post: ThreadPost; C: AppColors; onReplyPress: (p: ThreadPost) => void }) {
  const [liked, setLiked] = useState(!!post.liked);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [reposted, setReposted] = useState(!!post.reposted);
  const [repostCount, setRepostCount] = useState(post.reposts);
  const [bookmarked, setBookmarked] = useState(!!post.bookmarked);
  const [expanded, setExpanded] = useState(false);
  const heartScale = useSharedValue(1);
  const repostScale = useSharedValue(1);

  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: heartScale.value }] }));
  const repostStyle = useAnimatedStyle(() => ({ transform: [{ scale: repostScale.value }] }));

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    heartScale.value = withSpring(1.4, { damping: 5 }, () => { heartScale.value = withSpring(1); });
    if (post.threadId) toggleThreadLike(post.threadId, !next);
  };

  const handleRepost = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = !reposted;
    setReposted(next);
    setRepostCount((c) => c + (next ? 1 : -1));
    repostScale.value = withSpring(1.35, { damping: 5 }, () => { repostScale.value = withSpring(1); });
    if (post.threadId) toggleThreadRepost(post.threadId, !next);
  };

  const handleBookmark = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = !bookmarked;
    setBookmarked(next);
    if (post.threadId) toggleThreadBookmark(post.threadId, !next);
  };

  return (
    <Animated.View entering={FadeInDown.duration(320).springify()} style={[thrS.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
      {/* Author row */}
      <View style={thrS.authorRow}>
        <ThreadAvatar name={post.user} gradSeed={post.gradSeed} size={42} />
        {post.hasReply && (
          <View style={[thrS.threadLine, { backgroundColor: C.border }]} />
        )}
        <View style={thrS.authorInfo}>
          <View style={thrS.authorTop}>
            <Text style={[thrS.authorName, { color: C.textPrimary }]}>{post.user}</Text>
            <Text style={[thrS.authorHandle, { color: C.textMuted }]}>{post.handle}</Text>
            <Text style={[thrS.postTime, { color: C.textMuted }]}>· {post.time}</Text>
          </View>
          <Text style={[thrS.postText, { color: C.textPrimary }]}>{post.text}</Text>
          {post.tags && post.tags.length > 0 && (
            <View style={thrS.tagsRow}>
              {post.tags.map((tag) => (
                <TouchableOpacity key={tag} activeOpacity={0.7}>
                  <Text style={thrS.tag}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Actions */}
          <View style={thrS.actionsRow}>
            <TouchableOpacity style={thrS.actionItem} activeOpacity={0.7} onPress={handleLike}>
              <Animated.View style={heartStyle}>
                <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? '#FF2D87' : C.textMuted} />
              </Animated.View>
              <Text style={[thrS.actionCount, { color: liked ? '#FF2D87' : C.textMuted }]}>
                {fmtBig(likeCount)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={thrS.actionItem} activeOpacity={0.7} onPress={() => onReplyPress(post)}>
              <Ionicons name="chatbubble-outline" size={19} color={C.textMuted} />
              <Text style={[thrS.actionCount, { color: C.textMuted }]}>{fmtBig(post.comments)}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={thrS.actionItem} activeOpacity={0.7} onPress={handleRepost}>
              <Animated.View style={repostStyle}>
                <Ionicons name="repeat-outline" size={21} color={reposted ? '#00D4AA' : C.textMuted} />
              </Animated.View>
              <Text style={[thrS.actionCount, { color: reposted ? '#00D4AA' : C.textMuted }]}>
                {fmtBig(repostCount)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={thrS.actionItem} activeOpacity={0.7} onPress={handleBookmark}>
              <Ionicons name={bookmarked ? 'bookmark' : 'bookmark-outline'} size={19} color={bookmarked ? '#7B2FFF' : C.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={thrS.actionItem} activeOpacity={0.7} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
              <Ionicons name="paper-plane-outline" size={19} color={C.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Inline replies */}
      {post.replies && post.replies.length > 0 && (
        <>
          {(expanded ? post.replies : post.replies.slice(0, 1)).map((reply, ri) => (
            <View key={reply.id} style={[thrS.replyRow, ri === 0 && { borderTopColor: C.border, borderTopWidth: 1 }]}>
              <ThreadAvatar name={reply.user} gradSeed={reply.gradSeed} size={30} />
              <View style={thrS.replyContent}>
                <View style={thrS.replyTop}>
                  <Text style={[thrS.replyName, { color: C.textPrimary }]}>{reply.user}</Text>
                  <Text style={[thrS.replyHandle, { color: C.textMuted }]}>{reply.handle} · {reply.time}</Text>
                </View>
                <Text style={[thrS.replyText, { color: C.textSecondary }]}>{reply.text}</Text>
                <View style={thrS.replyActions}>
                  <TouchableOpacity style={thrS.replyActionItem} activeOpacity={0.7} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
                    <Ionicons name="heart-outline" size={15} color={C.textMuted} />
                    <Text style={[thrS.replyLikeCount, { color: C.textMuted }]}>{fmtBig(reply.likes)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={thrS.replyActionItem} activeOpacity={0.7} onPress={() => onReplyPress(post)}>
                    <Ionicons name="chatbubble-outline" size={14} color={C.textMuted} />
                    <Text style={[thrS.replyLikeCount, { color: C.textMuted }]}>Reply</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
          {post.replies.length > 1 && (
            <TouchableOpacity
              style={[thrS.expandBtn, { borderTopColor: C.border }]}
              activeOpacity={0.7}
              onPress={() => { Haptics.selectionAsync(); setExpanded((v) => !v); }}
            >
              <Text style={[thrS.expandText, { color: C.textMuted }]}>
                {expanded ? 'Show less' : `${post.replies.length - 1} more repl${post.replies.length - 1 === 1 ? 'y' : 'ies'}`}
              </Text>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={13} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </>
      )}
    </Animated.View>
  );
}

const thrS = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, marginHorizontal: 12, marginBottom: 12, overflow: 'hidden' },
  authorRow: { flexDirection: 'row', padding: 14, gap: 10, alignItems: 'flex-start' },
  threadLine: { position: 'absolute', left: 34, top: 62, width: 2, bottom: 0, borderRadius: 1 },
  authorInfo: { flex: 1, gap: 8 },
  authorTop: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  authorName: { fontFamily: 'DMSans-Bold', fontSize: 14 },
  authorHandle: { fontFamily: 'DMSans-Regular', fontSize: 13 },
  postTime: { fontFamily: 'DMSans-Regular', fontSize: 12 },
  postText: { fontFamily: 'DMSans-Regular', fontSize: 15, lineHeight: 22 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  tag: { fontFamily: 'DMSans-Medium', fontSize: 13, color: '#7B2FFF' },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 4, paddingBottom: 2 },
  actionItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionCount: { fontFamily: 'DMSans-Medium', fontSize: 13 },
  replyRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingVertical: 12, alignItems: 'flex-start' },
  replyContent: { flex: 1, gap: 4 },
  replyTop: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignItems: 'center' },
  replyName: { fontFamily: 'DMSans-Bold', fontSize: 13 },
  replyHandle: { fontFamily: 'DMSans-Regular', fontSize: 12 },
  replyText: { fontFamily: 'DMSans-Regular', fontSize: 13, lineHeight: 19 },
  replyActions: { flexDirection: 'row', gap: 14, marginTop: 4 },
  replyActionItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  replyLikeCount: { fontFamily: 'DMSans-Medium', fontSize: 12 },
  expandBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1 },
  expandText: { fontFamily: 'DMSans-Medium', fontSize: 13 },
});

// ─── Thread reply modal ────────────────────────────────────────────────────────

function ThreadReplyModal({ visible, onClose, post, C, insets }: {
  visible: boolean; onClose: () => void; post: ThreadPost | null; C: AppColors; insets: { bottom: number };
}) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    if (post?.threadId) await dbPostReply(post.threadId, text.trim());
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setText('');
    setSending(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} activeOpacity={1} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        <View style={[thrModalS.sheet, { backgroundColor: C.bgDeep, borderColor: C.border, paddingBottom: insets.bottom + 12 }]}>
          <View style={[thrModalS.handle, { backgroundColor: C.border }]} />
          <View style={[thrModalS.header, { borderBottomColor: C.border }]}>
            <Text style={[thrModalS.title, { color: C.textPrimary }]}>Reply to thread</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={C.textMuted} /></TouchableOpacity>
          </View>
          {post && (
            <View style={thrModalS.quoteBox}>
              <View style={thrModalS.quoteLeft}>
                <ThreadAvatar name={post.user} gradSeed={post.gradSeed} size={32} />
              </View>
              <View style={thrModalS.quoteRight}>
                <Text style={[thrModalS.quoteName, { color: C.textPrimary }]}>{post.user} <Text style={{ color: C.textMuted, fontFamily: 'DMSans-Regular' }}>{post.handle}</Text></Text>
                <Text style={[thrModalS.quoteText, { color: C.textSecondary }]} numberOfLines={2}>{post.text}</Text>
              </View>
            </View>
          )}
          <View style={[thrModalS.inputRow, { borderTopColor: C.border }]}>
            <TextInput
              style={[thrModalS.input, { backgroundColor: C.bgCard, color: C.textPrimary, borderColor: C.border }]}
              placeholder="Write your reply…"
              placeholderTextColor={C.textMuted}
              value={text}
              onChangeText={setText}
              multiline
              autoFocus={visible}
            />
            <TouchableOpacity
              onPress={handleSend}
              activeOpacity={0.7}
              style={[thrModalS.sendBtn, { backgroundColor: text.trim() ? '#FF2D87' : C.bgCard }]}
            >
              <Ionicons name="send" size={16} color={text.trim() ? '#FFFFFF' : C.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const thrModalS = StyleSheet.create({
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1 },
  title: { fontFamily: 'Syne-Bold', fontSize: 16 },
  quoteBox: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  quoteLeft: {},
  quoteRight: { flex: 1, gap: 3 },
  quoteName: { fontFamily: 'DMSans-Bold', fontSize: 13 },
  quoteText: { fontFamily: 'DMSans-Regular', fontSize: 13, lineHeight: 18 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontFamily: 'DMSans-Regular', fontSize: 14, maxHeight: 120 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
});

// ─── Threads screen ────────────────────────────────────────────────────────────

function ThreadsScreen({ C, insets }: { C: AppColors; insets: { top: number; bottom: number } }) {
  const [posts, setPosts] = useState<ThreadPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyPost, setReplyPost] = useState<ThreadPost | null>(null);
  const [composeText, setComposeText] = useState('');
  const [composing, setComposing] = useState(false);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    getThreadFeed(30).then((dbThreads) => {
      setPosts(dbThreads.map(dbThreadToPost));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handlePost = async () => {
    if (!composeText.trim() || posting) return;
    setPosting(true);
    const saved = await dbPostThread(composeText.trim());
    if (saved) {
      setPosts((prev) => [dbThreadToPost(saved, 0), ...prev]);
    } else {
      // optimistic fallback
      const optimistic: ThreadPost = {
        id: `local-${Date.now()}`,
        user: 'You', handle: '@you',
        text: composeText.trim(),
        time: 'now', likes: 0, comments: 0, reposts: 0,
        gradSeed: 2, tags: [], hasReply: false,
      };
      setPosts((prev) => [optimistic, ...prev]);
    }
    setComposeText('');
    setComposing(false);
    setPosting(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 90 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Compose bar */}
        <TouchableOpacity
          style={[thrFeedS.composeBar, { backgroundColor: C.bgCard, borderColor: C.border }]}
          activeOpacity={0.85}
          onPress={() => { setComposing(true); Haptics.selectionAsync(); }}
        >
          <LinearGradient colors={['#FF2D87','#7B2FFF']} style={thrFeedS.composeAvatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={thrFeedS.composeAvatarText}>YO</Text>
          </LinearGradient>
          <Text style={[thrFeedS.composePlaceholder, { color: C.textMuted }]}>What's on your mind?</Text>
          <View style={thrFeedS.composeBtn}>
            <LinearGradient colors={['#FF2D87','#7B2FFF']} style={thrFeedS.composeBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={thrFeedS.composeBtnText}>Post</Text>
            </LinearGradient>
          </View>
        </TouchableOpacity>

        {/* Thread cards */}
        {loading ? (
          <ActivityIndicator style={{ marginTop: 48 }} color="#FF2D87" size="large" />
        ) : posts.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 64, gap: 10 }}>
            <Ionicons name="chatbubbles-outline" size={48} color={C.textMuted} />
            <Text style={{ fontFamily: 'Syne-Bold', fontSize: 17, color: C.textPrimary }}>No threads yet</Text>
            <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 14, color: C.textMuted, textAlign: 'center', maxWidth: 220, lineHeight: 20 }}>
              Be the first to post a thread.
            </Text>
          </View>
        ) : posts.map((post) => (
          <ThreadCard key={post.id} post={post} C={C} onReplyPress={setReplyPost} />
        ))}
      </ScrollView>

      {/* Compose modal */}
      <Modal visible={composing} transparent animationType="slide" onRequestClose={() => setComposing(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} activeOpacity={1} onPress={() => setComposing(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <View style={[thrModalS.sheet, { backgroundColor: C.bgDeep, borderColor: C.border, paddingBottom: insets.bottom + 12 }]}>
            <View style={[thrModalS.handle, { backgroundColor: C.border }]} />
            <View style={[thrModalS.header, { borderBottomColor: C.border }]}>
              <Text style={[thrModalS.title, { color: C.textPrimary }]}>New Thread</Text>
              <TouchableOpacity onPress={() => setComposing(false)}><Ionicons name="close" size={22} color={C.textMuted} /></TouchableOpacity>
            </View>
            <View style={[thrModalS.inputRow, { borderTopColor: C.border }]}>
              <TextInput
                style={[thrModalS.input, { backgroundColor: C.bgCard, color: C.textPrimary, borderColor: C.border }]}
                placeholder="Start a thread…"
                placeholderTextColor={C.textMuted}
                value={composeText}
                onChangeText={setComposeText}
                multiline
                autoFocus
              />
              <TouchableOpacity
                onPress={handlePost}
                activeOpacity={0.7}
                style={[thrModalS.sendBtn, { backgroundColor: composeText.trim() ? '#FF2D87' : C.bgCard }]}
                disabled={posting}
              >
                {posting
                  ? <ActivityIndicator size="small" color="#FFFFFF" />
                  : <Ionicons name="send" size={16} color={composeText.trim() ? '#FFFFFF' : C.textMuted} />
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Reply modal */}
      <ThreadReplyModal
        visible={!!replyPost}
        onClose={() => setReplyPost(null)}
        post={replyPost}
        C={C}
        insets={insets}
      />
    </View>
  );
}

const thrFeedS = StyleSheet.create({
  composeBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 12, marginBottom: 14, padding: 12, borderRadius: 16, borderWidth: 1 },
  composeAvatar: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  composeAvatarText: { fontFamily: 'Syne-Bold', fontSize: 11, color: '#FFFFFF' },
  composePlaceholder: { flex: 1, fontFamily: 'DMSans-Regular', fontSize: 14 },
  composeBtn: { borderRadius: 10, overflow: 'hidden' },
  composeBtnGrad: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
  composeBtnText: { fontFamily: 'DMSans-Bold', fontSize: 13, color: '#FFFFFF' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { unreadCount } = useApp();
  const { colors: C } = useTheme();
  const [forYouPosts, setForYouPosts] = useState<VideoItem[]>([]);
  const [friendsPosts, setFriendsPosts] = useState<VideoItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feed, setFeed] = useState<'forYou' | 'friends' | 'threads'>('forYou');
  const [visibleIndex, setVisibleIndex] = useState(0);
  const [commentsItem, setCommentsItem] = useState<VideoItem | null>(null);
  const [shareVisible, setShareVisible] = useState(false);
  const [giftItem, setGiftItem] = useState<VideoItem | null>(null);

  const toVideoItem = useCallback((p: any, i: number): VideoItem => ({
    id: p.id,
    creator: {
      id: p.user_id,
      handle: p.handle,
      display_name: p.display_name,
      total_viewers: p.views ?? 0,
      platforms: [],
      is_live: false,
      last_streamed_at: null,
      stream_count: 0,
    },
    caption: p.caption ?? '',
    mediaUrl: p.media_url ?? null,
    views: p.views ?? 0,
    likes: p.likes ?? 0,
    comments: p.comments ?? 0,
    accentColor: ACCENT_COLORS[i % ACCENT_COLORS.length],
  }), []);

  const load = useCallback(async () => {
    if (!user?.id) { setFeedLoading(false); return; }
    const { getFeed } = await import('@/lib/feed');
    const [forYou, following] = await Promise.all([
      getFeed(user.id, 0, 20, 'forYou'),
      getFeed(user.id, 0, 20, 'following'),
    ]);
    setForYouPosts(forYou.map(toVideoItem));
    setFriendsPosts(following.map(toVideoItem));
    setFeedLoading(false);
  }, [user?.id, toVideoItem]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const items = feed === 'threads' ? [] : (feed === 'forYou' ? forYouPosts : friendsPosts);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0]?.index != null) setVisibleIndex(viewableItems[0].index);
  });

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 });

  const renderItem = useCallback(({ item, index }: { item: VideoItem; index: number }) => (
    <VideoCard
      item={item}
      isVisible={index === visibleIndex}
      C={C}
      insets={insets}
      onCommentPress={() => { setCommentsItem(item); trackEngagement(item.id, 'comment'); }}
      onSharePress={() => setShareVisible(true)}
      onGiftPress={() => setGiftItem(item)}
    />
  ), [visibleIndex, C, insets, setCommentsItem, setShareVisible, setGiftItem]);

  const keyExtractor = useCallback((item: VideoItem) => item.id, []);
  const getItemLayout = useCallback((_: any, index: number) => ({ length: SCREEN_H, offset: SCREEN_H * index, index }), []);

  const isThreads = feed === 'threads';

  return (
    <View style={styles.container}>
      {/* Video feed (hidden when threads is active) */}
      {!isThreads && feedLoading && (
        <View style={styles.emptyWrap}>
          <ActivityIndicator color="#FF2D87" size="large" />
        </View>
      )}
      {!isThreads && !feedLoading && items.length === 0 && (
        <View style={styles.emptyWrap}>
          <Ionicons name="film-outline" size={52} color="rgba(255,255,255,0.2)" />
          <Text style={styles.emptyTitle}>Nothing here yet</Text>
          <Text style={styles.emptySub}>
            {feed === 'friends' ? 'Follow creators to see their posts here.' : 'Be the first to post something.'}
          </Text>
        </View>
      )}
      {!isThreads && !feedLoading && items.length > 0 && (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={SCREEN_H}
          snapToAlignment="start"
          decelerationRate="fast"
          getItemLayout={getItemLayout}
          onViewableItemsChanged={onViewableItemsChanged.current}
          viewabilityConfig={viewabilityConfig.current}
          removeClippedSubviews
          maxToRenderPerBatch={3}
          windowSize={5}
        />
      )}

      {/* Threads feed */}
      {isThreads && (
        <View style={[StyleSheet.absoluteFill, { paddingTop: insets.top + 56, backgroundColor: C.bgDeep }]}>
          <ThreadsScreen C={C} insets={insets} />
        </View>
      )}

      {/* Floating header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 8, backgroundColor: isThreads ? C.bgDeep : 'transparent' },
        ]}
        pointerEvents="box-none"
      >
        <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.7} onPress={() => router.push('/search')}>
          <Ionicons name="search-outline" size={22} color={isThreads ? C.textPrimary : '#FFFFFF'} />
        </TouchableOpacity>
        <View style={styles.filterTabs} pointerEvents="box-none">
          {(['friends', 'forYou', 'threads'] as const).map((f) => {
            const active = feed === f;
            const label = f === 'friends' ? 'Friends' : f === 'forYou' ? 'For You' : 'Threads';
            const textColor = isThreads
              ? (active ? C.textPrimary : C.textMuted)
              : (active ? '#FFFFFF' : 'rgba(255,255,255,0.55)');
            return (
              <TouchableOpacity key={f} style={styles.filterTab} activeOpacity={0.75} onPress={() => { Haptics.selectionAsync(); setFeed(f); }}>
                <Text style={[styles.filterLabel, active && styles.filterLabelActive, { color: textColor }]}>
                  {label}
                </Text>
                {active && (
                  <LinearGradient colors={['#FF2D87', '#7B2FFF']} style={styles.filterUnderline} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.7} onPress={() => router.push('/notifications')}>
          <Ionicons name="notifications-outline" size={22} color={isThreads ? C.textPrimary : '#FFFFFF'} />
          {unreadCount > 0 && (
            <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text></View>
          )}
        </TouchableOpacity>
      </View>

      {/* Comments sheet */}
      <CommentsSheet
        visible={!!commentsItem}
        onClose={() => setCommentsItem(null)}
        item={commentsItem}
        C={C}
        insets={insets}
      />

      {/* Share sheet */}
      <ShareSheet
        visible={shareVisible}
        onClose={() => setShareVisible(false)}
        C={C}
        insets={insets}
      />

      {/* Gift sheet */}
      <GiftSheet
        visible={!!giftItem}
        onClose={() => setGiftItem(null)}
        recipientId={giftItem?.creator.id ?? ''}
        recipientName={giftItem?.creator.display_name || giftItem?.creator.handle || ''}
        C={C}
        insets={insets}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle: { fontFamily: 'Syne-Bold', fontSize: 18, color: 'rgba(255,255,255,0.5)' },
  emptySub: { fontFamily: 'DMSans-Regular', fontSize: 14, color: 'rgba(255,255,255,0.3)', textAlign: 'center', maxWidth: 240, lineHeight: 20 },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 10,
  },
  headerIconBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 4, right: 4, minWidth: 14, height: 14, borderRadius: 7, backgroundColor: '#FF2D87', borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { fontFamily: 'DMSans-Bold', fontSize: 8, color: '#FFFFFF' },
  filterTabs: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24 },
  filterTab: { alignItems: 'center', gap: 4 },
  filterLabel: { fontFamily: 'DMSans-Regular', fontSize: 15, color: 'rgba(255,255,255,0.55)' },
  filterLabelActive: { fontFamily: 'DMSans-Bold', fontSize: 16, color: '#FFFFFF' },
  filterUnderline: { width: 20, height: 2.5, borderRadius: 2 },
});
