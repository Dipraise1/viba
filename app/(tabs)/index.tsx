import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Modal,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ViewToken,
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
  FadeIn,
  FadeInUp,
  FadeInDown,
} from 'react-native-reanimated';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/themes';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { getPlatform } from '@/constants/platforms';
import { trackEngagement } from '@/lib/feed';

const { width: W, height: SCREEN_H } = Dimensions.get('window');

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
  song: string;
  views: number;
  likes: number;
  comments: number;
  imgSeed: string;
  accentColor: string;
  isViba?: boolean;
}

const ACCENT_COLORS = [
  '#FF2D87', '#7B2FFF', '#00D4AA', '#FF6B35',
  '#3F5EFB', '#f7971e', '#11998e', '#FC466B',
];

const POST_CAPTIONS = [
  'Going live tonight at 8PM — don\'t miss it 🔥',
  'Thank you for 10K followers!! You guys are everything 💜',
  'New gaming setup reveal — full stream replay dropping now',
  'Collab with @vibemaster dropping this Friday!',
  'Behind the scenes of last night\'s session 🎙️',
  'Crazy gifting moment from last week 😭❤️',
  'POV: you just found your new fav creator',
  'Just dropped the most insane stream highlights',
  'Stream starting in 5 mins — come hang 👋',
  'This reaction had me dead 💀 watch till the end',
  'First time trying this challenge and I actually did it',
  'y\'all kept asking for a tutorial so here it is 🎯',
];

const POST_SONGS = [
  'original sound - viba',
  'Flowers - Miley Cyrus',
  'Rich Flex - Drake',
  'Anti-Hero - Taylor Swift',
  'As It Was - Harry Styles',
  'About Damn Time - Lizzo',
  'Unholy - Sam Smith',
  'Break My Soul - Beyoncé',
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

// ─── Single video item ────────────────────────────────────────────────────────

function VideoCard({
  item, isVisible, C, insets, onCommentPress, onSharePress,
}: {
  item: VideoItem; isVisible: boolean; C: AppColors;
  insets: { top: number; bottom: number };
  onCommentPress: () => void;
  onSharePress: () => void;
}) {
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [following, setFollowing] = useState(false);
  const [playing, setPlaying] = useState(isVisible);
  const [progress, setProgress] = useState(0);
  const [imgLoaded, setImgLoaded] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const likeScale = useSharedValue(1);
  const progressRef = useRef(0);

  const VIDEO_DURATION = 45 + (item.imgSeed.charCodeAt(0) % 10) * 9;

  useEffect(() => {
    if (!isVisible && progressRef.current > 0) {
      // Track view with how much was watched when scrolling away
      const watchPct = Math.min(100, Math.round(progressRef.current * 100));
      const eventType = watchPct < 10 ? 'skip' : 'view';
      trackEngagement(item.id, eventType, watchPct);
    }
    setPlaying(isVisible);
    if (!isVisible) { setProgress(0); progressRef.current = 0; }
  }, [isVisible]);

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setProgress((p) => {
          const next = p >= 1 ? 0 : p + 1 / (VIDEO_DURATION * 10);
          progressRef.current = next;
          if (p >= 1) {
            clearInterval(intervalRef.current!);
            setPlaying(false);
            trackEngagement(item.id, 'view', 100);
          }
          return next;
        });
      }, 100);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing]);

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = !liked;
    setLiked(next);
    trackEngagement(item.id, next ? 'like' : 'view', Math.round(progressRef.current * 100));
    likeScale.value = withSpring(1.4, { damping: 6 }, () => { likeScale.value = withSpring(1); });
  };

  const likeStyle = useAnimatedStyle(() => ({ transform: [{ scale: likeScale.value }] }));
  const fmtNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n);

  const platforms = (item.creator.platforms ?? []).slice(0, 3);
  const imgUri = `https://picsum.photos/seed/${item.imgSeed}/600/900`;

  return (
    <View style={{ width: W, height: SCREEN_H }}>
      {/* Background image */}
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setPlaying((v) => !v)}>
        {/* Dark fallback while image loads */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0a0a14' }]} />
        <Image
          source={{ uri: imgUri }}
          style={[StyleSheet.absoluteFill, { opacity: imgLoaded ? 1 : 0 }]}
          resizeMode="cover"
          onLoad={() => setImgLoaded(true)}
        />
        {/* Dark overlay so text is always readable */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.28)' }]} />

        {/* Live badge */}
        {item.creator.is_live && (
          <View style={vidS.liveBadge}>
            <PulseDot size={6} color="#FFFFFF" />
            <Text style={vidS.liveBadgeText}>LIVE</Text>
          </View>
        )}

        {/* Viba featured mark */}
        {item.isViba && (
          <View style={[vidS.liveBadge, { backgroundColor: 'transparent', gap: 8 }]}>
            <LinearGradient colors={['#FF2D87', '#7B2FFF']} style={vidS.vibaIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Ionicons name="radio" size={12} color="#FFFFFF" />
            </LinearGradient>
            <Text style={vidS.vibaLabel}>viba</Text>
            <View style={vidS.featuredTag}><Text style={vidS.featuredTagText}>FEATURED</Text></View>
          </View>
        )}

        {/* Pause indicator */}
        {!playing && (
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

        {/* Progress bar */}
        <View style={[vidS.progressTrack, { bottom: insets.bottom + 56 }]}>
          <View style={[vidS.progressFill, { width: `${progress * 100}%`, backgroundColor: item.accentColor }]} />
        </View>
      </TouchableOpacity>

      {/* ── Right actions ── */}
      <View style={[vidS.actions, { bottom: insets.bottom + 80 }]}>
        <TouchableOpacity
          style={vidS.avatarWrap}
          activeOpacity={0.85}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); if (!item.isViba) router.push(`/user/${item.creator.id}` as any); else setFollowing((v) => !v); }}
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
          onPress={() => { if (!item.isViba) router.push(`/user/${item.creator.id}` as any); }}
        >
          <Text style={vidS.creatorName}>
            {item.isViba ? 'Viba' : (item.creator.display_name || item.creator.handle)}
          </Text>
          {item.isViba && (
            <View style={vidS.verifiedBadge}><Ionicons name="checkmark" size={9} color="#FFFFFF" /></View>
          )}
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

        <Text style={vidS.caption} numberOfLines={2}>{item.caption}</Text>

        <View style={vidS.musicRow}>
          <Ionicons name="musical-notes" size={12} color="rgba(255,255,255,0.8)" />
          <Text style={vidS.musicText} numberOfLines={1}>{item.song}</Text>
        </View>
      </View>
    </View>
  );
}

const vidS = StyleSheet.create({
  liveBadge: { position: 'absolute', top: 64, left: 16, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FF2D87', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  liveBadgeText: { fontFamily: 'DMSans-Bold', fontSize: 11, color: '#FFFFFF', letterSpacing: 0.4 },
  vibaIcon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  vibaLabel: { fontFamily: 'Syne-ExtraBold', fontSize: 15, color: '#FFFFFF', letterSpacing: 1 },
  featuredTag: { backgroundColor: 'rgba(255,45,135,0.9)', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  featuredTagText: { fontFamily: 'DMSans-Bold', fontSize: 9, color: '#FFFFFF', letterSpacing: 0.8 },
  pauseIcon: { position: 'absolute', top: '50%', left: '50%', marginTop: -28, marginLeft: -28 },
  progressTrack: { position: 'absolute', left: 0, right: 0, height: 2.5, backgroundColor: 'rgba(255,255,255,0.2)' },
  progressFill: { height: 2.5, borderRadius: 1 },
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
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { unreadCount } = useApp();
  const { colors: C } = useTheme();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [rankedPosts, setRankedPosts] = useState<VideoItem[]>([]);
  const [feed, setFeed] = useState<'forYou' | 'friends'>('forYou');
  const [visibleIndex, setVisibleIndex] = useState(0);
  const [commentsItem, setCommentsItem] = useState<VideoItem | null>(null);
  const [shareVisible, setShareVisible] = useState(false);

  const load = useCallback(async () => {
    // 1. Try ranked feed from algorithm
    if (user?.id) {
      const { getFeed } = await import('@/lib/feed');
      const ranked = await getFeed(user.id, 0, 20, 'forYou');
      if (ranked.length) {
        setRankedPosts(ranked.map((p, i) => ({
          id: p.id,
          creator: {
            id: p.user_id,
            handle: p.handle,
            display_name: p.display_name,
            total_viewers: p.views,
            platforms: [],
            is_live: false,
            last_streamed_at: null,
            stream_count: 0,
          },
          caption: p.caption ?? '',
          song: POST_SONGS[i % POST_SONGS.length],
          views: p.views,
          likes: p.likes,
          comments: p.comments,
          imgSeed: p.thumbnail_url ? '' : `ranked-${p.id.slice(0, 8)}`,
          accentColor: ACCENT_COLORS[i % ACCENT_COLORS.length],
        })));
      }
    }

    // 2. Always load creators for the mock fallback feed
    const { data } = await supabase
      .from('creator_discover')
      .select('*')
      .order('is_live', { ascending: false })
      .order('total_viewers', { ascending: false })
      .limit(30);
    if (data) setCreators(data.filter((c: Creator) => c.id !== user?.id));
  }, [user?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const vibaItem: VideoItem = {
    id: 'viba-featured',
    creator: { id: 'viba', handle: 'viba', display_name: 'Viba', total_viewers: 0, platforms: ['youtube', 'twitch', 'tiktok', 'instagram'], is_live: false, last_streamed_at: null, stream_count: 0 },
    caption: '🎬 Stream to TikTok, Instagram, YouTube & Twitch all at once — connect your platforms and go live in one tap.',
    song: 'original sound - viba',
    views: 89400, likes: 4200, comments: 312,
    imgSeed: 'viba-stream-hero',
    accentColor: '#FF2D87',
    isViba: true,
  };

  const mockItems = useMemo<VideoItem[]>(() => {
    const fromCreators = creators.slice(0, 20).map((c, i) => {
      const seed = c.id.charCodeAt(0) + c.id.charCodeAt(c.id.length - 1);
      return {
        id: `v-${c.id}`,
        creator: c,
        caption: POST_CAPTIONS[(i + 1) % POST_CAPTIONS.length],
        song: POST_SONGS[(seed + i) % POST_SONGS.length],
        views: 1200 + (seed * 317) % 48000,
        likes: 140 + (seed * 73) % 9800,
        comments: 12 + (seed * 29) % 480,
        imgSeed: `creator-${c.id.slice(0, 8)}-${i}`,
        accentColor: ACCENT_COLORS[(seed + i) % ACCENT_COLORS.length],
      };
    });
    return [vibaItem, ...fromCreators];
  }, [creators]);

  // Use ranked feed when available, fall back to mock
  const videoItems = rankedPosts.length ? [vibaItem, ...rankedPosts] : mockItems;

  const friendsItems = videoItems.slice(0, 6);
  const items = feed === 'forYou' ? videoItems : friendsItems;

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
    />
  ), [visibleIndex, C, insets]);

  const keyExtractor = useCallback((item: VideoItem) => item.id, []);
  const getItemLayout = useCallback((_: any, index: number) => ({ length: SCREEN_H, offset: SCREEN_H * index, index }), []);

  return (
    <View style={styles.container}>
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

      {/* Floating header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.7} onPress={() => router.push('/search')}>
          <Ionicons name="search-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.filterTabs} pointerEvents="box-none">
          {(['friends', 'forYou'] as const).map((f) => {
            const active = feed === f;
            return (
              <TouchableOpacity key={f} style={styles.filterTab} activeOpacity={0.75} onPress={() => { Haptics.selectionAsync(); setFeed(f); }}>
                <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>
                  {f === 'friends' ? 'Friends' : 'For You'}
                </Text>
                {active && (
                  <LinearGradient colors={['#FF2D87', '#7B2FFF']} style={styles.filterUnderline} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.7} onPress={() => router.push('/notifications')}>
          <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
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
