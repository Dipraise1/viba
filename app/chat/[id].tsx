import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  ZoomIn,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/themes';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  getOrCreateDm,
  getMessages,
  sendMessage,
  subscribeToMessages,
  markConversationRead,
  type ChatMessage,
} from '@/lib/messages';

// ─── Types ────────────────────────────────────────────────────────────────────

type Sender = 'me' | 'them';

interface Message {
  id: string;
  text: string;
  sender: Sender;
  time: string;
  read?: boolean;
  reaction?: string;
}

interface ContactProfile {
  id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  is_live?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GRADIENT_POOL: [string, string][] = [
  ['#FF2D87', '#7B2FFF'], ['#FF6B35', '#C020E0'],
  ['#00D4AA', '#0094FF'], ['#FFD700', '#FF6B35'],
  ['#00C9FF', '#7B2FFF'], ['#FC466B', '#3F5EFB'],
];

const REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

function avatarGrad(id: string): [string, string] {
  return GRADIENT_POOL[(id.charCodeAt(0) || 0) % GRADIENT_POOL.length];
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0] ?? '').join('').toUpperCase().slice(0, 2) || '??';
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffH = Math.floor(diffMins / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return d.toLocaleDateString();
}

function toUiMessage(m: ChatMessage, myId: string): Message {
  return {
    id: m.id,
    text: m.content,
    sender: m.sender_id === myId ? 'me' : 'them',
    time: fmtTime(m.created_at),
    read: m.sender_id === myId,
  };
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator({ C }: { C: AppColors }) {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    const bounce = (v: typeof dot1, delay: number) => {
      setTimeout(() => {
        v.value = withRepeat(
          withSequence(withTiming(-5, { duration: 300 }), withTiming(0, { duration: 300 })),
          -1, false
        );
      }, delay);
    };
    bounce(dot1, 0); bounce(dot2, 150); bounce(dot3, 300);
  }, []);

  const d1 = useAnimatedStyle(() => ({ transform: [{ translateY: dot1.value }] }));
  const d2 = useAnimatedStyle(() => ({ transform: [{ translateY: dot2.value }] }));
  const d3 = useAnimatedStyle(() => ({ transform: [{ translateY: dot3.value }] }));

  return (
    <Animated.View entering={FadeInDown.duration(200)} style={[typS.wrap, { backgroundColor: C.bgCard, borderColor: C.border }]}>
      <Animated.View style={[typS.dot, d1, { backgroundColor: C.textMuted }]} />
      <Animated.View style={[typS.dot, d2, { backgroundColor: C.textMuted }]} />
      <Animated.View style={[typS.dot, d3, { backgroundColor: C.textMuted }]} />
    </Animated.View>
  );
}
const typS = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 4, alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 18, borderBottomLeftRadius: 4, borderWidth: 1, alignSelf: 'flex-start', marginLeft: 16, marginBottom: 8 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});

// ─── Reaction picker ──────────────────────────────────────────────────────────

function ReactionPicker({ visible, onPick, onClose, C }: {
  visible: boolean; onPick: (r: string) => void; onClose: () => void; C: AppColors;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <Animated.View entering={ZoomIn.duration(180)} style={[reaS.picker, { backgroundColor: C.bgDeep, borderColor: C.border }]}>
        {REACTIONS.map((r) => (
          <TouchableOpacity key={r} style={reaS.reactionBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPick(r); }}>
            <Text style={reaS.reactionEmoji}>{r}</Text>
          </TouchableOpacity>
        ))}
      </Animated.View>
    </Modal>
  );
}
const reaS = StyleSheet.create({
  picker: { position: 'absolute', top: '45%', alignSelf: 'center', flexDirection: 'row', borderRadius: 28, padding: 8, gap: 4, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 12 },
  reactionBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  reactionEmoji: { fontSize: 26 },
});

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  msg, prevSender, nextSender, contact, C, onLongPress,
}: {
  msg: Message; prevSender: Sender | null; nextSender: Sender | null;
  contact: ContactProfile; C: AppColors; onLongPress: (id: string) => void;
}) {
  const isMe = msg.sender === 'me';
  const isFirstInGroup = prevSender !== msg.sender;
  const isLastInGroup = nextSender !== msg.sender;
  const grad = avatarGrad(contact.id);

  return (
    <Animated.View
      entering={FadeInDown.duration(200)}
      style={[bubS.row, isMe ? bubS.rowMe : bubS.rowThem, !isLastInGroup && { marginBottom: 2 }]}
    >
      {!isMe && (
        <View style={bubS.avatarSlot}>
          {isLastInGroup ? (
            <LinearGradient colors={grad} style={bubS.avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={bubS.avatarText}>{initials(contact.display_name)}</Text>
            </LinearGradient>
          ) : (
            <View style={bubS.avatarPlaceholder} />
          )}
        </View>
      )}

      <View style={[bubS.col, isMe && bubS.colMe]}>
        <Pressable
          onLongPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onLongPress(msg.id); }}
          delayLongPress={400}
          style={[
            bubS.bubble,
            isMe
              ? [bubS.bubbleMe, { borderBottomRightRadius: isLastInGroup ? 6 : 18 }]
              : [bubS.bubbleThem, { backgroundColor: C.bgCard, borderColor: C.border, borderBottomLeftRadius: isLastInGroup ? 6 : 18 }],
            !isLastInGroup && !isMe && { borderBottomLeftRadius: 18 },
            !isLastInGroup && isMe  && { borderBottomRightRadius: 18 },
          ]}
        >
          {isMe && (
            <LinearGradient colors={['#FF2D87', '#C020E0', '#7B2FFF']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          )}
          <Text style={[bubS.text, isMe ? bubS.textMe : { color: C.textPrimary }]}>{msg.text}</Text>
          {msg.reaction && (
            <View style={bubS.reactionBubble}><Text style={bubS.reactionText}>{msg.reaction}</Text></View>
          )}
        </Pressable>
        {isLastInGroup && (
          <View style={[bubS.meta, isMe && bubS.metaMe]}>
            <Text style={[bubS.metaText, { color: C.textMuted }]}>{msg.time}</Text>
            {isMe && msg.read && <Text style={[bubS.readText, { color: C.pink }]}>Sent</Text>}
            {isMe && !msg.read && <Ionicons name="checkmark-done-outline" size={13} color={C.textMuted} />}
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const bubS = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, marginBottom: 10 },
  rowMe: { justifyContent: 'flex-end' },
  rowThem: { justifyContent: 'flex-start' },
  avatarSlot: { width: 32, marginRight: 8, flexShrink: 0 },
  avatar: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Syne-Bold', fontSize: 10, color: '#FFFFFF' },
  avatarPlaceholder: { width: 32, height: 32 },
  col: { maxWidth: '72%', gap: 3 },
  colMe: { alignItems: 'flex-end' },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, overflow: 'hidden', borderWidth: 1, borderColor: 'transparent', position: 'relative' },
  bubbleMe: { borderBottomRightRadius: 6 },
  bubbleThem: { borderBottomLeftRadius: 6, borderWidth: 1 },
  text: { fontFamily: 'DMSans-Regular', fontSize: 15, lineHeight: 21 },
  textMe: { color: '#FFFFFF' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4 },
  metaMe: { justifyContent: 'flex-end' },
  metaText: { fontFamily: 'DMSans-Regular', fontSize: 11 },
  readText: { fontFamily: 'DMSans-Medium', fontSize: 11 },
  reactionBubble: { position: 'absolute', bottom: -10, right: 8, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 10, paddingHorizontal: 4, paddingVertical: 1 },
  reactionText: { fontSize: 14 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { id, name: paramName, handle: paramHandle } = useLocalSearchParams<{ id: string; name?: string; handle?: string }>();
  const insets = useSafeAreaInsets();
  const { colors: C } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => makeStyles(C), [C]);

  const [contact, setContact] = useState<ContactProfile>({
    id,
    display_name: paramName ?? 'User',
    handle: paramHandle ?? '@user',
    avatar_url: null,
  });
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [reactionTarget, setReactionTarget] = useState<string | null>(null);

  const listRef = useRef<FlatList>(null);

  // Load contact profile + conversation
  useEffect(() => {
    if (!user || !id) return;

    async function init() {
      // Fetch contact profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, display_name, handle, avatar_url')
        .eq('id', id)
        .maybeSingle();
      if (profile) setContact(profile as ContactProfile);

      // Get or create DM conversation
      try {
        const convId = await getOrCreateDm(id);
        setConversationId(convId);

        // Load existing messages
        const msgs = await getMessages(convId);
        setMessages(msgs.map((m) => toUiMessage(m, user!.id)));
        await markConversationRead(convId);
      } catch (e) {
        console.warn('Chat init error', e);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [id, user?.id]);

  // Real-time subscription
  useEffect(() => {
    if (!conversationId || !user) return;
    const unsub = subscribeToMessages(conversationId, (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, toUiMessage(msg, user.id)];
      });
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
      if (msg.sender_id !== user.id) markConversationRead(conversationId);
    });
    return unsub;
  }, [conversationId, user?.id]);

  const send = useCallback(async () => {
    if (!text.trim() || !conversationId || sending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const content = text.trim();
    setText('');
    setSending(true);
    try {
      const sent = await sendMessage(conversationId, content);
      setMessages((prev) => {
        if (prev.some((m) => m.id === sent.id)) return prev;
        return [...prev, toUiMessage(sent, user!.id)];
      });
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    } catch (e) {
      console.warn('Send error', e);
    } finally {
      setSending(false);
    }
  }, [text, conversationId, sending, user?.id]);

  const handleReaction = (emoji: string) => {
    if (!reactionTarget) return;
    setMessages((prev) => prev.map((m) => m.id === reactionTarget ? { ...m, reaction: emoji } : m));
    setReactionTarget(null);
  };

  const renderItem = useCallback(({ item, index }: { item: Message; index: number }) => {
    const prev = index > 0 ? messages[index - 1].sender : null;
    const next = index < messages.length - 1 ? messages[index + 1].sender : null;
    return (
      <MessageBubble msg={item} prevSender={prev} nextSender={next} contact={contact} C={C} onLongPress={setReactionTarget} />
    );
  }, [messages, contact, C]);

  const grad = avatarGrad(contact.id);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: C.border }]}>
        <TouchableOpacity style={styles.backBtn} activeOpacity={0.7}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/activity')}
        >
          <Ionicons name="chevron-back" size={24} color={C.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerCenter} activeOpacity={0.85}
          onPress={() => router.push({ pathname: '/user/[id]', params: { id: contact.id, name: contact.display_name, handle: contact.handle } } as any)}
        >
          <View style={styles.headerAvatarWrap}>
            <LinearGradient colors={grad} style={styles.headerAvatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={styles.headerAvatarText}>{initials(contact.display_name)}</Text>
            </LinearGradient>
          </View>
          <View style={styles.headerMeta}>
            <Text style={[styles.headerName, { color: C.textPrimary }]}>{contact.display_name}</Text>
            <Text style={[styles.headerSub, { color: C.textMuted }]}>@{contact.handle?.replace(/^@/, '')}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.7} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
            <Ionicons name="call-outline" size={21} color={C.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.7} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
            <Ionicons name="videocam-outline" size={22} color={C.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.pink} size="large" />
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
          <FlatList
            ref={listRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={(m) => m.id}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 12 }]}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <LinearGradient colors={grad} style={styles.emptyAvatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Text style={styles.emptyAvatarText}>{initials(contact.display_name)}</Text>
                </LinearGradient>
                <Text style={[styles.emptyName, { color: C.textPrimary }]}>{contact.display_name}</Text>
                <Text style={[styles.emptySub, { color: C.textMuted }]}>Say hi to start the conversation!</Text>
              </View>
            }
          />

          {/* Input bar */}
          <View style={[styles.inputBar, { borderTopColor: C.border, paddingBottom: insets.bottom + 10, backgroundColor: C.bg }]}>
            <TouchableOpacity style={styles.inputIcon} activeOpacity={0.7} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
              <Ionicons name="happy-outline" size={24} color={C.textMuted} />
            </TouchableOpacity>
            <View style={[styles.inputWrap, { backgroundColor: C.bgCard, borderColor: C.border }]}>
              <TextInput
                style={[styles.input, { color: C.textPrimary }]}
                placeholder="Message…"
                placeholderTextColor={C.textMuted}
                value={text}
                onChangeText={setText}
                multiline
                returnKeyType="default"
              />
              <TouchableOpacity activeOpacity={0.7} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
                <Ionicons name="image-outline" size={21} color={C.textMuted} />
              </TouchableOpacity>
            </View>
            {text.trim() ? (
              <TouchableOpacity onPress={send} activeOpacity={0.85} style={styles.sendBtn} disabled={sending}>
                <LinearGradient colors={['#FF2D87', '#7B2FFF']} style={styles.sendBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  {sending
                    ? <ActivityIndicator size="small" color="#FFF" />
                    : <Ionicons name="send" size={17} color="#FFFFFF" />}
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.inputIcon} activeOpacity={0.7} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
                <Ionicons name="mic-outline" size={24} color={C.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      )}

      <ReactionPicker visible={!!reactionTarget} onPick={handleReaction} onClose={() => setReactionTarget(null)} C={C} />
    </View>
  );
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 10, borderBottomWidth: 1, gap: 4 },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 4 },
    headerAvatarWrap: { position: 'relative' },
    headerAvatar: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    headerAvatarText: { fontFamily: 'Syne-Bold', fontSize: 13, color: '#FFFFFF' },
    onlineDot: { position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#00D4AA', borderWidth: 2 },
    headerMeta: { gap: 1 },
    headerName: { fontFamily: 'DMSans-Bold', fontSize: 15 },
    headerSub: { fontFamily: 'DMSans-Regular', fontSize: 12 },
    headerActions: { flexDirection: 'row', gap: 2 },
    headerIconBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
    listContent: { paddingTop: 16 },
    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 10 },
    emptyAvatar: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    emptyAvatarText: { fontFamily: 'Syne-ExtraBold', fontSize: 24, color: '#FFF' },
    emptyName: { fontFamily: 'Syne-Bold', fontSize: 18 },
    emptySub: { fontFamily: 'DMSans-Regular', fontSize: 14 },
    inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1 },
    inputIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 22, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8, minHeight: 42 },
    input: { flex: 1, fontFamily: 'DMSans-Regular', fontSize: 15, maxHeight: 100, padding: 0 },
    sendBtn: { width: 40, height: 40 },
    sendBtnGrad: { flex: 1, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  });
}
