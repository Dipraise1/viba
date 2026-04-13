import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeInLeft,
  Layout,
} from 'react-native-reanimated';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { PlatformId, getPlatform } from '@/constants/platforms';
import CommentBubble, { CommentBubbleProps } from '@/components/CommentBubble';

const { width } = Dimensions.get('window');

type FilterPlatform = 'all' | PlatformId;

const SAMPLE_COMMENTS: (CommentBubbleProps & { id: string })[] = [
  {
    id: '1',
    platform: 'tiktok',
    username: 'jaywave',
    text: 'This is so good omg!!',
    type: 'comment',
    timestamp: '2s',
  },
  {
    id: '2',
    platform: 'instagram',
    username: 'maya.creates',
    text: '',
    type: 'gift',
    giftName: 'Rose',
    giftCount: 5,
    timestamp: '5s',
  },
  {
    id: '3',
    platform: 'youtube',
    username: 'techvibes99',
    text: 'Love the quality, what mic are you using?',
    type: 'comment',
    timestamp: '8s',
  },
  {
    id: '4',
    platform: 'twitch',
    username: 'streamlord',
    text: '',
    type: 'gift',
    giftName: 'Star',
    giftCount: 100,
    timestamp: '12s',
  },
  {
    id: '5',
    platform: 'facebook',
    username: 'Rachel M',
    text: '',
    type: 'follow',
    timestamp: '15s',
  },
  {
    id: '6',
    platform: 'tiktok',
    username: 'noodles_fan',
    text: 'First time catching you live!',
    type: 'comment',
    timestamp: '18s',
  },
  {
    id: '7',
    platform: 'instagram',
    username: 'dre_art',
    text: 'Where are you streaming from? This background is wild',
    type: 'comment',
    timestamp: '22s',
  },
  {
    id: '8',
    platform: 'youtube',
    username: 'Priya K',
    text: '',
    type: 'follow',
    timestamp: '25s',
  },
  {
    id: '9',
    platform: 'tiktok',
    username: 'ghostvibes',
    text: 'The energy is immaculate rn',
    type: 'comment',
    timestamp: '28s',
  },
  {
    id: '10',
    platform: 'twitch',
    username: 'xXgamer_proXx',
    text: '',
    type: 'gift',
    giftName: 'Rose',
    giftCount: 1,
    timestamp: '31s',
  },
];

const FILTERS: { id: FilterPlatform; label: string; icon?: string; color?: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'tiktok', label: 'TikTok', icon: 'tiktok', color: '#FFFFFF' },
  { id: 'instagram', label: 'Instagram', icon: 'instagram', color: '#E1306C' },
  { id: 'facebook', label: 'Facebook', icon: 'facebook', color: '#1877F2' },
  { id: 'youtube', label: 'YouTube', icon: 'youtube', color: '#FF0000' },
  { id: 'twitch', label: 'Twitch', icon: 'twitch', color: '#9146FF' },
];

export default function CommentsScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<FilterPlatform>('all');
  const [reply, setReply] = useState('');
  const [replyTarget, setReplyTarget] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const filtered = filter === 'all'
    ? SAMPLE_COMMENTS
    : SAMPLE_COMMENTS.filter((c) => c.platform === filter);

  const handleReply = (id: string) => {
    Haptics.selectionAsync();
    setReplyTarget(id);
  };

  const sendReply = () => {
    if (!reply.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReply('');
    setReplyTarget(null);
  };

  const replyTargetComment = SAMPLE_COMMENTS.find((c) => c.id === replyTarget);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.headerTitle}>Activity</Text>
          <Text style={styles.headerSub}>Unified feed · all platforms</Text>
        </View>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {/* Platform filters */}
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        {FILTERS.map((f) => {
          const isActive = filter === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              style={[
                styles.filterPill,
                isActive && styles.filterPillActive,
                isActive && f.color ? { borderColor: f.color + '60', backgroundColor: f.color + '18' } : null,
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setFilter(f.id);
              }}
              activeOpacity={0.7}
            >
              {f.icon && (
                <View style={[
                  styles.filterIcon,
                  isActive && f.color ? { backgroundColor: f.color } : null,
                ]}>
                  <FontAwesome5
                    name={f.icon}
                    size={13}
                    color="#FFFFFF"
                    solid
                  />
                </View>
              )}
              <Text style={[
                styles.filterText,
                isActive && styles.filterTextActive,
                isActive && f.color ? { color: f.color } : null,
              ]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </Animated.ScrollView>

      {/* Comment count */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {filtered.length} messages
        </Text>
        <TouchableOpacity style={styles.autoScrollBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-down-circle-outline" size={16} color={Colors.textMuted} />
          <Text style={styles.autoScrollText}>Auto-scroll</Text>
        </TouchableOpacity>
      </View>

      {/* Comments feed */}
      <FlatList
        ref={flatListRef}
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.feedContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeInLeft.delay(index * 40).duration(350)}
            layout={Layout.springify()}
          >
            <CommentBubble
              platform={item.platform}
              username={item.username}
              text={item.text}
              type={item.type}
              giftName={item.giftName}
              giftCount={item.giftCount}
              timestamp={item.timestamp}
              onReply={item.type === 'comment' ? () => handleReply(item.id) : undefined}
            />
          </Animated.View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />

      {/* Reply box */}
      <View style={[styles.replyBar, { paddingBottom: insets.bottom + 8 }]}>
        {replyTarget && replyTargetComment && (
          <View style={styles.replyContext}>
            <Ionicons name="return-down-forward" size={12} color={Colors.pink} />
            <Text style={styles.replyContextText} numberOfLines={1}>
              Replying to{' '}
              <Text style={styles.replyContextName}>@{replyTargetComment.username}</Text>
              {' on '}
              <Text style={styles.replyContextPlatform}>{replyTargetComment.platform}</Text>
            </Text>
            <TouchableOpacity onPress={() => setReplyTarget(null)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Ionicons name="close-circle" size={14} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.replyInputRow}>
          <TextInput
            style={styles.replyInput}
            placeholder={replyTarget ? 'Write a reply…' : 'Message all platforms…'}
            placeholderTextColor={Colors.textMuted}
            value={reply}
            onChangeText={setReply}
            multiline
            maxLength={200}
          />
          <TouchableOpacity
            style={[styles.sendBtn, reply.trim() && styles.sendBtnActive]}
            onPress={sendReply}
            activeOpacity={0.7}
            disabled={!reply.trim()}
          >
            <Ionicons
              name="send"
              size={16}
              color={reply.trim() ? '#FFFFFF' : Colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontFamily: 'Syne-ExtraBold',
    fontSize: 28,
    color: Colors.textPrimary,
  },
  headerSub: {
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.pink,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  liveText: {
    fontFamily: 'Syne-Bold',
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    flexDirection: 'row',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterPillActive: {
    backgroundColor: Colors.pinkDim,
    borderColor: Colors.borderPink,
  },
  filterIcon: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: Colors.bgGlass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 15,
    color: Colors.textMuted,
  },
  filterTextActive: {
    color: Colors.pink,
  },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  countText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: Colors.textMuted,
  },
  autoScrollBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  autoScrollText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: Colors.textMuted,
  },
  feedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  replyBar: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.bg,
    paddingTop: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  replyContext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  replyContextText: {
    flex: 1,
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: Colors.textMuted,
  },
  replyContextName: {
    fontFamily: 'DMSans-Bold',
    color: Colors.textPrimary,
  },
  replyContextPlatform: {
    fontFamily: 'DMSans-Medium',
    color: Colors.pink,
  },
  replyInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  replyInput: {
    flex: 1,
    fontFamily: 'DMSans-Regular',
    fontSize: 15,
    color: Colors.textPrimary,
    maxHeight: 80,
    paddingTop: 0,
    paddingBottom: 0,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.bgGlass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: {
    backgroundColor: Colors.pink,
  },
});
