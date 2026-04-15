import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  FlatList,
  Keyboard,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, CameraType, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  FadeInDown,
  FadeInUp,
  FadeOutDown,
  FadeInLeft,
  FadeOutLeft,
  ZoomIn,
  SlideInLeft,
  SlideOutLeft,
} from 'react-native-reanimated';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { AppColors } from '@/constants/themes';
import { PLATFORMS, PlatformId, getPlatform } from '@/constants/platforms';
import { useApp, MIN_VIBA_TO_STREAM, VIBA_EARN_RATE } from '@/context/AppContext';
import { startStreamSession, endStreamSession } from '@/lib/streams';
import { notifyStreamEnded, notifyViewerMilestone } from '@/lib/notifications';

const { width, height } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────

type StreamStatus = 'setup' | 'starting' | 'live' | 'stopping';

interface LiveComment {
  id: string;
  platform: PlatformId;
  username: string;
  text: string;
  type: 'comment' | 'gift' | 'follow';
  giftName?: string;
  giftCount?: number;
  color: string;
  isCreatorReply?: boolean;
  replyTo?: string; // username being replied to
}

// ─── Fake comment stream ──────────────────────────────────────────────────────

const FAKE_COMMENTS: Omit<LiveComment, 'id'>[] = [
  { platform: 'tiktok', username: 'jaywave', text: 'yo this is live!!', type: 'comment', color: '#FFFFFF' },
  { platform: 'instagram', username: 'maya.creates', text: '', type: 'gift', giftName: 'Rose', giftCount: 5, color: '#FF2D87' },
  { platform: 'youtube', username: 'techvibes99', text: 'what mic are you using?', type: 'comment', color: '#FFFFFF' },
  { platform: 'twitch', username: 'streamlord', text: '', type: 'gift', giftName: 'Star', giftCount: 100, color: '#FFB800' },
  { platform: 'facebook', username: 'Rachel M', text: '', type: 'follow', color: '#00D97E' },
  { platform: 'tiktok', username: 'noodles_fan', text: 'first time catching you live!', type: 'comment', color: '#FFFFFF' },
  { platform: 'instagram', username: 'dre_art', text: 'the vibe is immaculate', type: 'comment', color: '#FFFFFF' },
  { platform: 'youtube', username: 'Priya K', text: '', type: 'follow', color: '#00D97E' },
  { platform: 'tiktok', username: 'ghostvibes', text: 'energy is everything rn', type: 'comment', color: '#FFFFFF' },
  { platform: 'twitch', username: 'xXgamer_proXx', text: '', type: 'gift', giftName: 'Rose', giftCount: 3, color: '#FF2D87' },
  { platform: 'instagram', username: 'luna_sky', text: 'loving this stream', type: 'comment', color: '#FFFFFF' },
  { platform: 'tiktok', username: 'zack.mp4', text: 'go off bestie', type: 'comment', color: '#FFFFFF' },
  { platform: 'youtube', username: 'CodeWithMe', text: 'subbed!', type: 'comment', color: '#FFFFFF' },
  { platform: 'twitch', username: 'pixel_rush', text: '', type: 'gift', giftName: 'Star', giftCount: 200, color: '#FFB800' },
  { platform: 'facebook', username: 'Tom B', text: 'amazing content as always', type: 'comment', color: '#FFFFFF' },
];

// ─── Pulsing ring ─────────────────────────────────────────────────────────────

function PulsingRing({ delay }: { delay: number }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);
  useEffect(() => {
    scale.value = withDelay(delay, withRepeat(withTiming(1.9, { duration: 1400 }), -1, false));
    opacity.value = withDelay(delay, withRepeat(withTiming(0, { duration: 1400 }), -1, false));
  }, []);
  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#FF2D87',
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
  return <Animated.View style={style} />;
}

// ─── Live comment row (overlay) ───────────────────────────────────────────────

function LiveCommentRow({
  item,
  onPress,
  isSelected,
}: {
  item: LiveComment;
  onPress?: (item: LiveComment) => void;
  isSelected?: boolean;
}) {
  const platform = getPlatform(item.platform);
  const giftEmoji: Record<string, string> = { Rose: '🌹', Star: '⭐', default: '🎁' };
  const canReply = item.type === 'comment' || item.type === 'follow';

  return (
    <Animated.View
      entering={SlideInLeft.duration(300).springify()}
      exiting={FadeOutLeft.duration(200)}
      style={overlayStyles.row}
    >
      <View style={[overlayStyles.platformDot, { backgroundColor: platform.gradient[0] as string }]}>
        <FontAwesome5 name={platform.icon} size={7} color="#FFFFFF" solid />
      </View>

      <TouchableOpacity
        activeOpacity={canReply ? 0.75 : 1}
        onPress={canReply && onPress ? () => onPress(item) : undefined}
        style={[overlayStyles.bubble, isSelected && overlayStyles.bubbleSelected]}
      >
        {item.isCreatorReply && (
          <View style={overlayStyles.creatorTag}>
            <Ionicons name="return-down-forward" size={9} color={'#FF2D87'} />
            <Text style={overlayStyles.creatorTagText}>You replied</Text>
          </View>
        )}
        {item.type === 'comment' && (
          <Text style={overlayStyles.text} numberOfLines={2}>
            <Text style={overlayStyles.username}>{item.username} </Text>
            {item.text}
          </Text>
        )}
        {item.type === 'gift' && (
          <Text style={overlayStyles.text}>
            <Text style={overlayStyles.username}>{item.username} </Text>
            <Text style={{ color: item.color }}>
              sent {item.giftCount && item.giftCount > 1 ? `${item.giftCount}x ` : ''}
              {giftEmoji[item.giftName ?? ''] ?? giftEmoji.default} {item.giftName}
            </Text>
          </Text>
        )}
        {item.type === 'follow' && (
          <Text style={overlayStyles.text}>
            <Text style={overlayStyles.username}>{item.username} </Text>
            <Text style={{ color: '#00D97E' }}>followed you</Text>
          </Text>
        )}
        {canReply && !isSelected && (
          <Text style={overlayStyles.replyHint}>tap to reply</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const overlayStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    maxWidth: width * 0.75,
    marginBottom: 6,
  },
  platformDot: {
    width: 18,
    height: 18,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginBottom: 2,
  },
  bubble: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 12,
    borderTopLeftRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 2,
  },
  bubbleSelected: {
    backgroundColor: 'rgba(255,45,135,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,45,135,0.5)',
  },
  creatorTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 1,
  },
  creatorTagText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    color: '#FF2D87',
  },
  username: {
    fontFamily: 'DMSans-Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  text: {
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
  },
  replyHint: {
    fontFamily: 'DMSans-Regular',
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 1,
  },
});

// ─── Permission screen ─────────────────────────────────────────────────────────

function PermissionScreen({ onRequest, C }: { onRequest: () => void; C: AppColors }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[permStyles.container, { backgroundColor: C.bg, paddingTop: insets.top + 20 }]}>
      <Animated.View entering={ZoomIn.duration(500)} style={permStyles.iconWrap}>
        <LinearGradient colors={['#FF2D87', '#7B2FFF']} style={permStyles.iconCircle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Ionicons name="camera" size={36} color="#FFFFFF" />
        </LinearGradient>
      </Animated.View>
      <Animated.Text entering={FadeInDown.delay(200).duration(400)} style={[permStyles.title, { color: C.textPrimary }]}>
        Camera access needed
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(300).duration(400)} style={[permStyles.sub, { color: C.textSecondary }]}>
        Viba needs camera and microphone access to broadcast your stream to all platforms.
      </Animated.Text>
      <Animated.View entering={FadeInDown.delay(400).duration(400)}>
        <TouchableOpacity style={permStyles.btn} onPress={onRequest} activeOpacity={0.85}>
          <LinearGradient colors={['#FF2D87', '#7B2FFF']} style={permStyles.btnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={permStyles.btnText}>Grant Access</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const permStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', paddingHorizontal: 32, gap: 20 },
  iconWrap: { marginTop: 40, marginBottom: 8 },
  iconCircle: { width: 100, height: 100, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Syne-ExtraBold', fontSize: 26, textAlign: 'center' },
  sub: { fontFamily: 'DMSans-Regular', fontSize: 15, textAlign: 'center', lineHeight: 24 },
  btn: { borderRadius: 16, overflow: 'hidden', marginTop: 8 },
  btnGrad: { paddingHorizontal: 40, paddingVertical: 16, borderRadius: 16 },
  btnText: { fontFamily: 'Syne-Bold', fontSize: 16, color: '#FFFFFF' },
});

// ─── Setup screen (pre-live) ──────────────────────────────────────────────────

function SetupScreen({
  selectedIds,
  onToggle,
  streamTitle,
  onTitleChange,
  onGoLive,
  cameraRef,
  facing,
  onFlip,
  micEnabled,
  onToggleMic,
  connectedPlatforms,
  insets,
  tokenBalance,
  canStream,
}: {
  selectedIds: Set<PlatformId>;
  onToggle: (id: PlatformId) => void;
  streamTitle: string;
  onTitleChange: (t: string) => void;
  onGoLive: () => void;
  cameraRef: any;
  facing: CameraType;
  onFlip: () => void;
  micEnabled: boolean;
  onToggleMic: () => void;
  connectedPlatforms: PlatformId[];
  insets: { top: number; bottom: number };
  tokenBalance: number;
  canStream: boolean;
}) {
  const [titleFocused, setTitleFocused] = useState(false);

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Camera preview behind — highest quality */}
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} mode="video" videoQuality="2160p" />

      {/* Dark gradient overlay */}
      <LinearGradient
        colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.85)']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Top controls */}
      <View style={[setupStyles.topBar, { paddingTop: insets.top + 10 }]}>
        <View style={setupStyles.topLeft}>
          <TouchableOpacity style={setupStyles.iconBtn} onPress={onFlip} activeOpacity={0.8}>
            <Ionicons name="camera-reverse-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[setupStyles.iconBtn, !micEnabled && setupStyles.iconBtnOff]}
            onPress={onToggleMic}
            activeOpacity={0.8}
          >
            <Ionicons name={micEnabled ? 'mic-outline' : 'mic-off-outline'} size={22} color={micEnabled ? '#FFFFFF' : '#FF4444'} />
          </TouchableOpacity>
        </View>
        <Text style={setupStyles.readyLabel}>Ready to go live</Text>
        <TouchableOpacity style={setupStyles.iconBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="close" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Bottom panel */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'position' : 'height'}
        style={setupStyles.bottomKAV}
        keyboardVerticalOffset={0}
      >
        <View style={[setupStyles.bottomPanel, { paddingBottom: insets.bottom + 12 }]}>
          {/* Title input */}
          <View style={[setupStyles.titleWrap, titleFocused && setupStyles.titleWrapFocused]}>
            <Ionicons name="create-outline" size={16} color={titleFocused ? '#FF2D87' : 'rgba(255,255,255,0.4)'} />
            <TextInput
              value={streamTitle}
              onChangeText={onTitleChange}
              placeholder="Add a stream title…"
              placeholderTextColor="rgba(255,255,255,0.35)"
              style={setupStyles.titleInput}
              maxLength={80}
              onFocus={() => setTitleFocused(true)}
              onBlur={() => setTitleFocused(false)}
              returnKeyType="done"
            />
          </View>

          {/* Platform pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={setupStyles.platformScroll} contentContainerStyle={setupStyles.platformRow}>
            {PLATFORMS.map((p) => {
              const isConnected = connectedPlatforms.includes(p.id);
              const isSelected = selectedIds.has(p.id);
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    setupStyles.platformPill,
                    isSelected && { backgroundColor: p.gradient[0] + 'CC', borderColor: p.gradient[0] },
                    !isConnected && setupStyles.platformPillOff,
                  ]}
                  onPress={() => isConnected && onToggle(p.id)}
                  activeOpacity={0.8}
                  disabled={!isConnected}
                >
                  <FontAwesome5 name={p.icon} size={13} color={isSelected || !isConnected ? (isConnected ? '#FFFFFF' : 'rgba(255,255,255,0.3)') : 'rgba(255,255,255,0.7)'} solid />
                  <Text style={[setupStyles.platformPillText, !isConnected && setupStyles.platformPillTextOff]}>
                    {p.name}
                  </Text>
                  {isSelected && (
                    <View style={setupStyles.platformPillCheck}>
                      <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>


          {/* Go live button */}
          <TouchableOpacity
            style={[setupStyles.goLiveBtn, (selectedIds.size === 0 || !canStream) && setupStyles.goLiveBtnDisabled]}
            onPress={onGoLive}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#FF2D87', '#7B2FFF']}
              style={setupStyles.goLiveBtnGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="radio" size={18} color="#FFFFFF" />
              <Text style={setupStyles.goLiveBtnText}>
                Go Live{selectedIds.size > 0 ? ` · ${selectedIds.size} platform${selectedIds.size > 1 ? 's' : ''}` : ''}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const setupStyles = StyleSheet.create({
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  topLeft: { flexDirection: 'row', gap: 10 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  iconBtnOff: {
    borderColor: 'rgba(255,68,68,0.4)',
    backgroundColor: 'rgba(255,68,68,0.15)',
  },
  readyLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bottomKAV: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomPanel: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  titleWrapFocused: {
    borderColor: '#FF2D87',
    backgroundColor: 'rgba(255,45,135,0.12)',
  },
  titleInput: {
    flex: 1,
    fontFamily: 'DMSans-Regular',
    fontSize: 15,
    color: '#FFFFFF',
  },
  platformScroll: { flexGrow: 0 },
  platformRow: { gap: 8, paddingVertical: 2 },
  platformPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  platformPillOff: { opacity: 0.35 },
  platformPillText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: '#FFFFFF',
  },
  platformPillTextOff: { color: 'rgba(255,255,255,0.4)' },
  platformPillCheck: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goLiveBtn: { borderRadius: 16, overflow: 'hidden' },
  goLiveBtnDisabled: { opacity: 0.38 },
  goLiveBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  goLiveBtnText: {
    fontFamily: 'Syne-Bold',
    fontSize: 17,
    color: '#FFFFFF',
  },
  tokenRow: { width: '100%' },
  tokenPill: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tokenPillOk: {
    backgroundColor: 'rgba(0,217,126,0.08)',
    borderColor: 'rgba(0,217,126,0.2)',
  },
  tokenPillWarn: {
    backgroundColor: 'rgba(255,184,0,0.08)',
    borderColor: 'rgba(255,184,0,0.2)',
  },
  tokenPillText: {
    fontFamily: 'Syne-Bold',
    fontSize: 14,
  },
  tokenPillSub: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
  },
});

// ─── Live overlay screen ──────────────────────────────────────────────────────

function LiveScreen({
  cameraRef,
  facing,
  onFlip,
  micEnabled,
  onToggleMic,
  onEndStream,
  liveSeconds,
  viewerCount,
  selectedIds,
  comments,
  onAddComment,
  streamTitle,
  insets,
}: {
  cameraRef: any;
  facing: CameraType;
  onFlip: () => void;
  micEnabled: boolean;
  onToggleMic: () => void;
  onEndStream: () => void;
  liveSeconds: number;
  viewerCount: number;
  selectedIds: Set<PlatformId>;
  comments: LiveComment[];
  onAddComment: (c: LiveComment) => void;
  streamTitle: string;
  insets: { top: number; bottom: number };
}) {
  const [replyTarget, setReplyTarget] = useState<LiveComment | null>(null);
  const [replyText, setReplyText] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );
    return () => { show.remove(); hide.remove(); };
  }, []);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '00')}`;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const handleSelectComment = (item: LiveComment) => {
    Haptics.selectionAsync();
    setReplyTarget(item);
    setReplyText('');
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const handleDismissReply = () => {
    setReplyTarget(null);
    setReplyText('');
    Keyboard.dismiss();
  };

  const handleSendReply = () => {
    if (!replyText.trim() || !replyTarget) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Inject the creator reply into the comment feed
    const reply: LiveComment = {
      id: `reply_${Date.now()}`,
      platform: replyTarget.platform,
      username: 'You',
      text: `@${replyTarget.username} ${replyText.trim()}`,
      type: 'comment',
      color: '#FFFFFF',
      isCreatorReply: true,
      replyTo: replyTarget.username,
    };
    onAddComment(reply);
    setReplyText('');
    setReplyTarget(null);
    Keyboard.dismiss();
  };

  const visibleComments = comments.slice(-8);
  const replyBarBottom = keyboardHeight > 0
    ? keyboardHeight + 8
    : insets.bottom + 12;

  return (
    <View style={StyleSheet.absoluteFill}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} mode="video" videoQuality="2160p" />

        {/* Top gradient */}
        <LinearGradient colors={['rgba(0,0,0,0.7)', 'transparent']} style={liveStyles.topGrad} pointerEvents="none" />
        {/* Bottom gradient */}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={liveStyles.bottomGrad} pointerEvents="none" />

        {/* Tap-away to dismiss reply */}
        {replyTarget && (
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleDismissReply} />
        )}

        {/* Top bar */}
        <View style={[liveStyles.topBar, { paddingTop: insets.top + 8 }]}>
          <View style={liveStyles.topLeft}>
            <View style={liveStyles.livePill}>
              <View style={liveStyles.liveDot} />
              <Text style={liveStyles.liveLabel}>LIVE</Text>
            </View>
            <Text style={liveStyles.timer}>{formatTime(liveSeconds)}</Text>
            <View style={liveStyles.tokenEarnPill}>
              <Text style={liveStyles.tokenEarnText}>+{liveSeconds} $VIBA</Text>
            </View>
          </View>
          <View style={liveStyles.viewerPill}>
            <Ionicons name="eye-outline" size={13} color="rgba(255,255,255,0.8)" />
            <Text style={liveStyles.viewerText}>{viewerCount.toLocaleString()}</Text>
          </View>
          <View style={liveStyles.topRight}>
            <TouchableOpacity style={liveStyles.ctrlBtn} onPress={onFlip} activeOpacity={0.8}>
              <Ionicons name="camera-reverse-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[liveStyles.ctrlBtn, !micEnabled && liveStyles.ctrlBtnOff]}
              onPress={onToggleMic}
              activeOpacity={0.8}
            >
              <Ionicons name={micEnabled ? 'mic-outline' : 'mic-off-outline'} size={20} color={micEnabled ? '#FFFFFF' : '#FF4444'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Platform dots */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={[liveStyles.platformRow, { top: insets.top + 64 }]}>
          {Array.from(selectedIds).map((id) => {
            const p = getPlatform(id);
            return (
              <View key={id} style={[liveStyles.platformDot, { backgroundColor: p.gradient[0] as string }]}>
                <FontAwesome5 name={p.icon} size={10} color="#FFFFFF" solid />
              </View>
            );
          })}
          <Text style={liveStyles.platformDotLabel}>{selectedIds.size} stream{selectedIds.size > 1 ? 's' : ''}</Text>
        </Animated.View>

        {/* Stream title */}
        {streamTitle.length > 0 && (
          <Animated.View entering={FadeInDown.delay(300).duration(400)} style={[liveStyles.titleTag, { top: insets.top + 98 }]}>
            <Text style={liveStyles.titleTagText} numberOfLines={1}>{streamTitle}</Text>
          </Animated.View>
        )}

        {/* Comments overlay */}
        <View style={[liveStyles.commentOverlay, { bottom: replyTarget ? 130 : replyBarBottom + 60 }]}>
          {visibleComments.map((c) => (
            <LiveCommentRow
              key={c.id}
              item={c}
              onPress={c.isCreatorReply ? undefined : handleSelectComment}
              isSelected={replyTarget?.id === c.id}
            />
          ))}
        </View>

        {/* Reply bar — always visible, context changes when replying */}
        <Animated.View
          entering={FadeInUp.duration(300)}
          style={[liveStyles.replyBar, { bottom: replyBarBottom }]}
        >
          {replyTarget && (
            <Animated.View entering={FadeInDown.duration(200)} style={liveStyles.replyContext}>
              <FontAwesome5
                name={getPlatform(replyTarget.platform).icon}
                size={10}
                color={getPlatform(replyTarget.platform).gradient[0] as string}
                solid
              />
              <Text style={liveStyles.replyContextText} numberOfLines={1}>
                Replying to <Text style={liveStyles.replyContextName}>@{replyTarget.username}</Text>
              </Text>
              <TouchableOpacity onPress={handleDismissReply} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </Animated.View>
          )}
          <View style={liveStyles.replyInputRow}>
            <TextInput
              ref={inputRef}
              style={liveStyles.replyInput}
              value={replyText}
              onChangeText={setReplyText}
              placeholder={replyTarget ? `Reply to @${replyTarget.username}…` : 'Say something to your viewers…'}
              placeholderTextColor="rgba(255,255,255,0.3)"
              maxLength={150}
              returnKeyType="send"
              onSubmitEditing={handleSendReply}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[liveStyles.sendBtn, replyText.trim() && liveStyles.sendBtnActive]}
              onPress={handleSendReply}
              activeOpacity={0.8}
              disabled={!replyText.trim()}
            >
              <Ionicons name="send" size={15} color={replyText.trim() ? '#FFFFFF' : 'rgba(255,255,255,0.3)'} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* End stream — right side, below camera controls */}
        <View style={[liveStyles.endWrap, { top: insets.top + 58 }]}>
          <TouchableOpacity style={liveStyles.endBtn} onPress={onEndStream} activeOpacity={0.85}>
            <Ionicons name="stop" size={15} color="#FFFFFF" />
            <Text style={liveStyles.endBtnText}>End</Text>
          </TouchableOpacity>
        </View>
      </View>
  );
}

const liveStyles = StyleSheet.create({
  topGrad: { position: 'absolute', top: 0, left: 0, right: 0, height: 180 },
  bottomGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 220 },
  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  tokenEarnPill: {
    backgroundColor: 'rgba(168,85,247,0.25)',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.4)',
  },
  tokenEarnText: {
    fontFamily: 'Syne-Bold',
    fontSize: 10,
    color: '#C084FC',
    letterSpacing: 0.5,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FF2D87',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
  liveLabel: { fontFamily: 'Syne-Bold', fontSize: 11, color: '#FFFFFF', letterSpacing: 1.5 },
  timer: { fontFamily: 'DMSans-Medium', fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  viewerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  viewerText: { fontFamily: 'DMSans-Medium', fontSize: 12, color: '#FFFFFF' },
  topRight: { flexDirection: 'row', gap: 8 },
  ctrlBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  ctrlBtnOff: { borderColor: 'rgba(255,68,68,0.4)', backgroundColor: 'rgba(255,68,68,0.15)' },
  platformRow: {
    position: 'absolute',
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  platformDot: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  platformDotLabel: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  titleTag: {
    position: 'absolute',
    left: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: width * 0.6,
  },
  titleTagText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
  },
  commentOverlay: {
    position: 'absolute',
    left: 12,
    right: 80,
    justifyContent: 'flex-end',
  },
  replyBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    gap: 6,
  },
  replyContext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  replyContextText: {
    flex: 1,
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
  },
  replyContextName: {
    fontFamily: 'DMSans-Bold',
    color: '#FFFFFF',
  },
  replyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
  },
  replyInput: {
    flex: 1,
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: '#FFFFFF',
    paddingVertical: 4,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: {
    backgroundColor: '#FF2D87',
  },
  endWrap: {
    position: 'absolute',
    right: 12,
    alignItems: 'flex-end',
  },
  endBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(200,30,30,0.85)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,100,100,0.3)',
  },
  endBtnText: {
    fontFamily: 'Syne-Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },
});

// ─── Starting overlay ─────────────────────────────────────────────────────────

function StartingOverlay({ selectedIds }: { selectedIds: Set<PlatformId> }) {
  return (
    <View style={startStyles.container}>
      <LinearGradient colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.85)']} style={StyleSheet.absoluteFill} />
      <Animated.View entering={ZoomIn.duration(500)} style={startStyles.center}>
        <View style={startStyles.rings}>
          <PulsingRing delay={0} />
          <PulsingRing delay={500} />
          <View style={startStyles.innerCircle}>
            <LinearGradient colors={['#FF2D87', '#7B2FFF']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <Ionicons name="radio" size={28} color="#FFFFFF" />
          </View>
        </View>
        <Text style={startStyles.text}>Going live…</Text>
        <View style={startStyles.platformRow}>
          {Array.from(selectedIds).map((id) => {
            const p = getPlatform(id);
            return (
              <View key={id} style={[startStyles.platformDot, { backgroundColor: p.gradient[0] as string }]}>
                <FontAwesome5 name={p.icon} size={11} color="#FFFFFF" solid />
              </View>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}

const startStyles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 20 },
  center: { alignItems: 'center', gap: 20 },
  rings: { width: 90, height: 90, alignItems: 'center', justifyContent: 'center' },
  innerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  text: { fontFamily: 'Syne-Bold', fontSize: 20, color: '#FFFFFF' },
  platformRow: { flexDirection: 'row', gap: 10 },
  platformDot: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
});

// ─── Stream ended screen ──────────────────────────────────────────────────────

function StreamEndedScreen({
  liveSeconds,
  viewerCount,
  selectedIds,
  insets,
  C,
  onDone,
  onStreamAgain,
}: {
  liveSeconds: number;
  viewerCount: number;
  selectedIds: Set<PlatformId>;
  insets: { top: number; bottom: number };
  C: AppColors;
  onDone: () => void;
  onStreamAgain: () => void;
}) {
  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <View style={[endedStyles.container, { backgroundColor: C.bg, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
      <Animated.View entering={ZoomIn.duration(400).springify()} style={endedStyles.iconWrap}>
        <LinearGradient colors={['#FF2D87', '#7B2FFF']} style={endedStyles.iconCircle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Ionicons name="stop-circle" size={40} color="#FFFFFF" />
        </LinearGradient>
      </Animated.View>

      <Animated.Text entering={FadeInDown.delay(150).duration(400)} style={[endedStyles.title, { color: C.textPrimary }]}>
        Stream ended
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(220).duration(400)} style={[endedStyles.sub, { color: C.textSecondary }]}>
        Great stream! Here's how it went.
      </Animated.Text>

      <Animated.View entering={FadeInDown.delay(300).duration(400)} style={[endedStyles.statsRow, { backgroundColor: C.bgCard, borderColor: C.border }]}>
        <View style={endedStyles.statCard}>
          <Text style={[endedStyles.statValue, { color: C.textPrimary }]}>{formatTime(liveSeconds)}</Text>
          <Text style={[endedStyles.statLabel, { color: C.textMuted }]}>Duration</Text>
        </View>
        <View style={[endedStyles.statDivider, { backgroundColor: C.border }]} />
        <View style={endedStyles.statCard}>
          <Text style={[endedStyles.statValue, { color: C.textPrimary }]}>{viewerCount.toLocaleString()}</Text>
          <Text style={[endedStyles.statLabel, { color: C.textMuted }]}>Peak viewers</Text>
        </View>
        <View style={[endedStyles.statDivider, { backgroundColor: C.border }]} />
        <View style={endedStyles.statCard}>
          <Text style={[endedStyles.statValue, { color: C.textPrimary }]}>{selectedIds.size}</Text>
          <Text style={[endedStyles.statLabel, { color: C.textMuted }]}>Platforms</Text>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(380).duration(400)} style={endedStyles.platformsRow}>
        {Array.from(selectedIds).map((id) => {
          const p = getPlatform(id);
          return (
            <View key={id} style={[endedStyles.platformDot, { backgroundColor: p.gradient[0] as string }]}>
              <FontAwesome5 name={p.icon} size={13} color="#FFFFFF" solid />
            </View>
          );
        })}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(460).duration(400)} style={endedStyles.btnRow}>
        <TouchableOpacity style={[endedStyles.btnSecondary, { borderColor: C.border, backgroundColor: C.bgCard }]} onPress={onStreamAgain} activeOpacity={0.8}>
          <Ionicons name="radio-outline" size={18} color={C.pink} />
          <Text style={[endedStyles.btnSecondaryText, { color: C.textPrimary }]}>Stream Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={endedStyles.btnPrimary} onPress={onDone} activeOpacity={0.85}>
          <LinearGradient colors={['#FF2D87', '#7B2FFF']} style={endedStyles.btnPrimaryGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={endedStyles.btnPrimaryText}>Done</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const endedStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  iconWrap: { marginBottom: 4 },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Syne-ExtraBold',
    fontSize: 28,
    textAlign: 'center',
  },
  sub: {
    fontFamily: 'DMSans-Regular',
    fontSize: 15,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 20,
    paddingHorizontal: 24,
    width: '100%',
    marginTop: 8,
  },
  statCard: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, height: 36 },
  statValue: {
    fontFamily: 'Syne-ExtraBold',
    fontSize: 22,
  },
  statLabel: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
  },
  platformsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  btnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1,
  },
  btnSecondaryText: {
    fontFamily: 'Syne-Bold',
    fontSize: 15,
  },
  btnPrimary: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  btnPrimaryGrad: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  btnPrimaryText: {
    fontFamily: 'Syne-Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  platformDot: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ─── Root component ───────────────────────────────────────────────────────────

export default function GoLiveTab() {
  const insets = useSafeAreaInsets();
  const { colors: C } = useTheme();
  const { platforms, streamSettings, tokenBalance, addTokens, addNotification } = useApp();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const cameraRef = useRef<CameraView>(null);
  const connectedPlatforms = platforms.filter((p) => p.connected).map((p) => p.id);

  const [facing, setFacing] = useState<CameraType>(streamSettings.camera === 'back' ? 'back' : 'front');
  const [micEnabled, setMicEnabled] = useState(streamSettings.micEnabled);
  const [selectedIds, setSelectedIds] = useState<Set<PlatformId>>(new Set(connectedPlatforms));
  const [streamTitle, setStreamTitle] = useState('');
  const [status, setStatus] = useState<StreamStatus>('setup');
  const [liveSeconds, setLiveSeconds] = useState(0);
  const [viewerCount, setViewerCount] = useState(0);
  const [comments, setComments] = useState<LiveComment[]>([]);
  const commentIndexRef = useRef(0);
  const sessionIdRef = useRef<string | null>(null);
  const peakViewersRef = useRef(0);
  const milestonesFiredRef = useRef<Set<number>>(new Set());

  // Sync selected when connected changes
  useEffect(() => {
    if (status === 'setup') setSelectedIds(new Set(connectedPlatforms));
  }, [platforms]);

  // Live timer + 1 token/sec earning + viewer growth + milestones
  useEffect(() => {
    if (status !== 'live') return;
    const timer = setInterval(() => {
      // Earn 1 $VIBA per second
      addTokens(VIBA_EARN_RATE, 'Stream earnings');

      setLiveSeconds((s) => s + 1);
      if (Math.random() < 0.55) {
        setViewerCount((v) => {
          const next = v + Math.floor(Math.random() * 9 + 1);
          if (next > peakViewersRef.current) peakViewersRef.current = next;
          const milestones = [100, 500, 1000, 5000, 10000];
          for (const m of milestones) {
            if (next >= m && !milestonesFiredRef.current.has(m)) {
              milestonesFiredRef.current.add(m);
              notifyViewerMilestone(m);
              addNotification({
                type: 'milestone',
                title: `${m.toLocaleString()} viewers!`,
                body: `You just hit ${m.toLocaleString()} concurrent viewers across all platforms.`,
              });
            }
          }
          return next;
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [status]);

  // Fake comment stream
  useEffect(() => {
    if (status !== 'live') return;
    const addComment = () => {
      const raw = FAKE_COMMENTS[commentIndexRef.current % FAKE_COMMENTS.length];
      commentIndexRef.current += 1;
      const comment: LiveComment = { ...raw, id: `${Date.now()}_${Math.random()}` };
      setComments((prev) => [...prev.slice(-19), comment]);
    };
    // First comment quickly, then random intervals
    const first = setTimeout(addComment, 600);
    const interval = setInterval(addComment, 1800 + Math.random() * 1400);
    return () => { clearTimeout(first); clearInterval(interval); };
  }, [status]);

  const togglePlatform = (id: PlatformId) => {
    Haptics.selectionAsync();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { if (next.size === 1) return prev; next.delete(id); }
      else next.add(id);
      return next;
    });
  };

  const handleGoLive = async () => {
    if (selectedIds.size === 0) return;
    // Token gate — must hold MIN_VIBA_TO_STREAM tokens
    if (tokenBalance < MIN_VIBA_TO_STREAM) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Insufficient $VIBA',
        `You need at least ${MIN_VIBA_TO_STREAM} $VIBA tokens to go live. You currently have ${tokenBalance}.\n\nGo to your Wallet to buy more tokens.`,
        [
          { text: 'Open Wallet', onPress: () => router.push('/(tabs)/wallet') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    peakViewersRef.current = 0;
    milestonesFiredRef.current = new Set();
    setStatus('starting');
    // Save session start to DB
    const id = await startStreamSession(streamTitle, Array.from(selectedIds));
    sessionIdRef.current = id;
    setTimeout(() => {
      setStatus('live');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 2200);
  };

  const handleEndStream = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setStatus('stopping');
    if (sessionIdRef.current) {
      await endStreamSession(sessionIdRef.current, liveSeconds, peakViewersRef.current);
      sessionIdRef.current = null;
    }
    notifyStreamEnded(liveSeconds, peakViewersRef.current);
    addNotification({
      type: 'milestone',
      title: 'Stream ended',
      body: `You earned ${liveSeconds} $VIBA in ${Math.floor(liveSeconds / 60)}m ${liveSeconds % 60}s with ${peakViewersRef.current.toLocaleString()} peak viewers.`,
    });
  };

  const handleStreamAgain = () => {
    setStatus('setup');
    setLiveSeconds(0);
    setViewerCount(0);
    setComments([]);
    commentIndexRef.current = 0;
  };

  // ── Permissions ──────────────────────────────────────────────────────────────

  const requestPermissions = async () => {
    await requestCameraPermission();
    await requestMicPermission();
  };

  if (!cameraPermission || !micPermission) {
    return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  }

  if (!cameraPermission.granted || !micPermission.granted) {
    return <PermissionScreen onRequest={requestPermissions} C={C} />;
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* Setup view */}
      {status === 'setup' && (
        <SetupScreen
          selectedIds={selectedIds}
          onToggle={togglePlatform}
          streamTitle={streamTitle}
          onTitleChange={setStreamTitle}
          onGoLive={handleGoLive}
          cameraRef={cameraRef}
          facing={facing}
          onFlip={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))}
          micEnabled={micEnabled}
          onToggleMic={() => { Haptics.selectionAsync(); setMicEnabled((m) => !m); }}
          connectedPlatforms={connectedPlatforms}
          insets={insets}
          tokenBalance={tokenBalance}
          canStream={tokenBalance >= MIN_VIBA_TO_STREAM}
        />
      )}

      {/* Stream ended summary — camera is closed */}
      {status === 'stopping' && (
        <StreamEndedScreen
          liveSeconds={liveSeconds}
          viewerCount={viewerCount}
          selectedIds={selectedIds}
          insets={insets}
          C={C}
          onDone={() => router.back()}
          onStreamAgain={handleStreamAgain}
        />
      )}

      {(status === 'live') && (
        <LiveScreen
          cameraRef={cameraRef}
          facing={facing}
          onFlip={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))}
          micEnabled={micEnabled}
          onToggleMic={() => { Haptics.selectionAsync(); setMicEnabled((m) => !m); }}
          onEndStream={handleEndStream}
          liveSeconds={liveSeconds}
          viewerCount={viewerCount}
          selectedIds={selectedIds}
          comments={comments}
          onAddComment={(c) => setComments((prev) => [...prev.slice(-19), c])}
          streamTitle={streamTitle}
          insets={insets}
        />
      )}

      {/* Starting overlay on top */}
      {status === 'starting' && (
        <>
          {/* Still show camera during starting */}
          <CameraView style={StyleSheet.absoluteFill} facing={facing} />
          <StartingOverlay selectedIds={selectedIds} />
        </>
      )}
    </View>
  );
}
