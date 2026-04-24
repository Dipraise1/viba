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

interface ChatContact {
  id: string;
  name: string;
  handle: string;
  isLive: boolean;
  isOnline: boolean;
  gradSeed: number;
}

// ─── Static contact data ──────────────────────────────────────────────────────

const CONTACTS: Record<string, ChatContact> = {
  c1: { id: 'c1', name: 'Jay Wave',       handle: '@jaywave',      isLive: true,  isOnline: true,  gradSeed: 0 },
  c2: { id: 'c2', name: 'Maya Creates',   handle: '@maya.creates', isLive: false, isOnline: true,  gradSeed: 1 },
  c3: { id: 'c3', name: 'StreamLord',     handle: '@streamlord',   isLive: true,  isOnline: true,  gradSeed: 2 },
  c4: { id: 'c4', name: 'TechVibes99',    handle: '@techvibes99',  isLive: false, isOnline: false, gradSeed: 3 },
  c5: { id: 'c5', name: 'Ghost Vibes',    handle: '@ghostvibes',   isLive: false, isOnline: false, gradSeed: 4 },
  c6: { id: 'c6', name: 'Dre Art',        handle: '@dre_art',      isLive: false, isOnline: false, gradSeed: 5 },
};

const DEFAULT_CONTACT: ChatContact = {
  id: 'unknown', name: 'User', handle: '@user', isLive: false, isOnline: false, gradSeed: 0,
};

// ─── Mock conversations ───────────────────────────────────────────────────────

const CONVOS: Record<string, Message[]> = {
  c1: [
    { id: 'm1',  text: 'That stream was insane bro 🔥',                             sender: 'them', time: '2:28 PM' },
    { id: 'm2',  text: 'The part where you hit that combo had me screaming 😭',      sender: 'them', time: '2:28 PM' },
    { id: 'm3',  text: 'Haha thanks!! I honestly didn\'t think it would go that well', sender: 'me', time: '2:30 PM' },
    { id: 'm4',  text: 'I was so nervous for the first 20 mins lol',                 sender: 'me',   time: '2:30 PM' },
    { id: 'm5',  text: 'Couldn\'t even tell, you were so locked in',                 sender: 'them', time: '2:31 PM' },
    { id: 'm6',  text: 'When\'s the next one?',                                      sender: 'them', time: '2:32 PM' },
    { id: 'm7',  text: 'Thinking Friday night around 8PM',                           sender: 'me',   time: '2:33 PM' },
    { id: 'm8',  text: 'Maybe do a gaming night + reaction content',                 sender: 'me',   time: '2:33 PM' },
    { id: 'm9',  text: 'Bet I\'ll be there 👀🔥',                                   sender: 'them', time: '2:34 PM' },
    { id: 'm10', text: 'Also — would you be down for a collab?',                     sender: 'them', time: '2:35 PM' },
    { id: 'm11', text: 'We could do a joint stream next month, reach both audiences', sender: 'them', time: '2:35 PM' },
    { id: 'm12', text: 'YESSS that sounds so good',                                  sender: 'me',   time: '2:36 PM' },
    { id: 'm13', text: 'Let me know your schedule and we\'ll plan it out',           sender: 'me',   time: '2:36 PM', read: true },
    { id: 'm14', text: 'Perfect I\'ll DM you a doc with potential dates 🙌',         sender: 'them', time: '2:37 PM' },
  ],
  c2: [
    { id: 'm1', text: 'Hey! Love your content 💜',                                  sender: 'them', time: 'Yesterday' },
    { id: 'm2', text: 'Thank you so much!! That means a lot 🥹',                    sender: 'me',   time: 'Yesterday' },
    { id: 'm3', text: 'I actually had an idea I wanted to run by you',              sender: 'them', time: 'Yesterday' },
    { id: 'm4', text: 'Can we collab next week?',                                    sender: 'them', time: '15m ago', read: true },
  ],
  c3: [
    { id: 'm1', text: 'Sent you a gift 🎁',                sender: 'them', time: '1h ago' },
    { id: 'm2', text: 'Omg thank you so much!! 😭❤️',      sender: 'me',   time: '1h ago' },
    { id: 'm3', text: 'You deserve it, keep going!',       sender: 'them', time: '58m ago', read: true },
  ],
  c4: [
    { id: 'm1', text: 'What\'s your stream setup?',               sender: 'them', time: '3h ago' },
    { id: 'm2', text: 'I use the Elgato 4K60 Pro + Rode NT-USB', sender: 'me',   time: '3h ago' },
    { id: 'm3', text: 'For lighting I have 2x Elgato Key Light',  sender: 'me',   time: '3h ago', read: true },
    { id: 'm4', text: 'That\'s a solid setup, nice!',             sender: 'them', time: '2h ago' },
  ],
};

const GRADIENT_POOL: [string, string][] = [
  ['#FF2D87', '#7B2FFF'],
  ['#FF6B35', '#C020E0'],
  ['#00D4AA', '#0094FF'],
  ['#FFD700', '#FF6B35'],
  ['#00C9FF', '#7B2FFF'],
  ['#FC466B', '#3F5EFB'],
];

const REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

function avatarGrad(seed: number): [string, string] {
  return GRADIENT_POOL[seed % GRADIENT_POOL.length];
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0] ?? '').join('').toUpperCase().slice(0, 2);
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
    bounce(dot1, 0);
    bounce(dot2, 150);
    bounce(dot3, 300);
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
  msg: Message;
  prevSender: Sender | null;
  nextSender: Sender | null;
  contact: ChatContact;
  C: AppColors;
  onLongPress: (id: string) => void;
}) {
  const isMe = msg.sender === 'me';
  const isFirstInGroup = prevSender !== msg.sender;
  const isLastInGroup = nextSender !== msg.sender;

  const grad = avatarGrad(contact.gradSeed);

  return (
    <Animated.View
      entering={FadeInDown.duration(200)}
      style={[
        bubS.row,
        isMe ? bubS.rowMe : bubS.rowThem,
        !isLastInGroup && { marginBottom: 2 },
      ]}
    >
      {/* Them avatar — only on last message in group */}
      {!isMe && (
        <View style={bubS.avatarSlot}>
          {isLastInGroup ? (
            <LinearGradient colors={grad} style={bubS.avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={bubS.avatarText}>{initials(contact.name)}</Text>
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
            !isLastInGroup && isMe && { borderBottomRightRadius: 18 },
          ]}
        >
          {isMe && (
            <LinearGradient
              colors={['#FF2D87', '#C020E0', '#7B2FFF']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            />
          )}
          <Text style={[bubS.text, isMe ? bubS.textMe : { color: C.textPrimary }]}>
            {msg.text}
          </Text>
          {msg.reaction && (
            <View style={bubS.reactionBubble}>
              <Text style={bubS.reactionText}>{msg.reaction}</Text>
            </View>
          )}
        </Pressable>

        {/* Time + read status — only on last in group */}
        {isLastInGroup && (
          <View style={[bubS.meta, isMe && bubS.metaMe]}>
            <Text style={[bubS.metaText, { color: C.textMuted }]}>{msg.time}</Text>
            {isMe && msg.read && (
              <Text style={[bubS.readText, { color: C.pink }]}>Read</Text>
            )}
            {isMe && !msg.read && (
              <Ionicons name="checkmark-done-outline" size={13} color={C.textMuted} />
            )}
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
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const contact = CONTACTS[id] ?? DEFAULT_CONTACT;
  const grad = avatarGrad(contact.gradSeed);

  const [messages, setMessages] = useState<Message[]>(
    CONVOS[id] ?? [{ id: 'm0', text: 'Hey! 👋', sender: 'them', time: 'Just now' }]
  );
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [reactionTarget, setReactionTarget] = useState<string | null>(null);

  const listRef = useRef<FlatList>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Simulate "them" typing after sending a message
  const simulateTyping = () => {
    setTyping(true);
    typingTimerRef.current = setTimeout(() => {
      setTyping(false);
      const replies = [
        'Sounds great! 🙌', 'Haha love that', 'For real!!', 'Let\'s do it 🔥',
        'I\'m in 👀', 'That\'s 🔥🔥', 'Yesss!!', 'Ok ok I see you 😂',
      ];
      const reply: Message = {
        id: `m${Date.now()}`,
        text: replies[Math.floor(Math.random() * replies.length)],
        sender: 'them',
        time: 'Just now',
      };
      setMessages((prev) => [...prev, reply]);
    }, 2000 + Math.random() * 1500);
  };

  useEffect(() => {
    return () => { if (typingTimerRef.current) clearTimeout(typingTimerRef.current); };
  }, []);

  const send = () => {
    if (!text.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newMsg: Message = {
      id: `m${Date.now()}`,
      text: text.trim(),
      sender: 'me',
      time: 'Just now',
    };
    setMessages((prev) => [...prev, newMsg]);
    setText('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    simulateTyping();
  };

  const handleReaction = (emoji: string) => {
    if (!reactionTarget) return;
    setMessages((prev) => prev.map((m) => m.id === reactionTarget ? { ...m, reaction: emoji } : m));
    setReactionTarget(null);
  };

  const renderItem = useCallback(({ item, index }: { item: Message; index: number }) => {
    const prev = index > 0 ? messages[index - 1].sender : null;
    const next = index < messages.length - 1 ? messages[index + 1].sender : null;
    return (
      <MessageBubble
        msg={item}
        prevSender={prev}
        nextSender={next}
        contact={contact}
        C={C}
        onLongPress={setReactionTarget}
      />
    );
  }, [messages, contact, C]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: C.border }]}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.7}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/activity')}
        >
          <Ionicons name="chevron-back" size={24} color={C.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerCenter} activeOpacity={0.85} onPress={() => router.push({ pathname: '/user/[id]', params: { id: contact.id, name: contact.name, handle: contact.handle } } as any)}>
          <View style={styles.headerAvatarWrap}>
            <LinearGradient colors={grad} style={styles.headerAvatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={styles.headerAvatarText}>{initials(contact.name)}</Text>
            </LinearGradient>
            {contact.isOnline && <View style={[styles.onlineDot, { borderColor: C.bg }]} />}
          </View>
          <View style={styles.headerMeta}>
            <Text style={[styles.headerName, { color: C.textPrimary }]}>{contact.name}</Text>
            <Text style={[styles.headerSub, { color: contact.isLive ? '#FF2D87' : C.textMuted }]}>
              {contact.isLive ? '🔴 Live now' : contact.isOnline ? 'Online' : 'Offline'}
            </Text>
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

      {/* Messages list */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(m) => m.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 12 }]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListFooterComponent={typing ? <TypingIndicator C={C} /> : null}
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
            <TouchableOpacity onPress={send} activeOpacity={0.85} style={styles.sendBtn}>
              <LinearGradient
                colors={['#FF2D87', '#7B2FFF']}
                style={styles.sendBtnGrad}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                <Ionicons name="send" size={17} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.inputIcon} activeOpacity={0.7} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
              <Ionicons name="mic-outline" size={24} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Reaction picker */}
      <ReactionPicker
        visible={!!reactionTarget}
        onPick={handleReaction}
        onClose={() => setReactionTarget(null)}
        C={C}
      />
    </View>
  );
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 6, paddingVertical: 10,
      borderBottomWidth: 1,
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerAvatarWrap: { position: 'relative' },
    headerAvatar: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    headerAvatarText: { fontFamily: 'Syne-Bold', fontSize: 13, color: '#FFFFFF' },
    onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 11, height: 11, borderRadius: 6, backgroundColor: '#00D4AA', borderWidth: 2 },
    headerMeta: { gap: 1 },
    headerName: { fontFamily: 'DMSans-Bold', fontSize: 15 },
    headerSub: { fontFamily: 'DMSans-Regular', fontSize: 12 },
    headerActions: { flexDirection: 'row', gap: 2 },
    headerIconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    listContent: { paddingTop: 16 },
    inputBar: {
      flexDirection: 'row', alignItems: 'flex-end',
      paddingHorizontal: 8, paddingTop: 10,
      borderTopWidth: 1, gap: 6,
    },
    inputIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    inputWrap: {
      flex: 1, flexDirection: 'row', alignItems: 'flex-end',
      borderRadius: 22, borderWidth: 1,
      paddingHorizontal: 14, paddingVertical: 9, gap: 8,
      minHeight: 42,
    },
    input: { flex: 1, fontFamily: 'DMSans-Regular', fontSize: 15, maxHeight: 100, padding: 0 },
    sendBtn: { width: 40, height: 40, flexShrink: 0 },
    sendBtnGrad: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  });
}
