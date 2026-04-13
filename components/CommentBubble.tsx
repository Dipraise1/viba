import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { getPlatform, PlatformId } from '@/constants/platforms';

export interface CommentBubbleProps {
  platform: PlatformId;
  username: string;
  text: string;
  type: 'comment' | 'gift' | 'follow' | 'like';
  giftName?: string;
  giftCount?: number;
  timestamp?: string;
  onReply?: () => void;
  compact?: boolean;
}

function PlatformBadge({ platformId }: { platformId: PlatformId }) {
  const platform = getPlatform(platformId);
  return (
    <View style={[badgeStyles.badge, { backgroundColor: platform.gradient[0] as string }]}>
      <FontAwesome5 name={platform.icon} size={8} color="#FFFFFF" solid />
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -7,
    left: 10,
    zIndex: 10,
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.bg,
  },
});

export default function CommentBubble({
  platform,
  username,
  text,
  type,
  giftName,
  giftCount,
  timestamp,
  onReply,
  compact = false,
}: CommentBubbleProps) {
  if (type === 'gift') {
    return (
      <View style={styles.wrapper}>
        <PlatformBadge platformId={platform} />
        <View style={styles.giftRow}>
          <Text style={styles.giftEmoji}>
            {giftName === 'Rose' ? '🌹' : giftName === 'Star' ? '⭐' : '🎁'}
          </Text>
          <View style={styles.giftMeta}>
            <Text style={styles.username}>{username}</Text>
            <Text style={styles.giftDesc}>
              sent{' '}
              <Text style={styles.giftHighlight}>
                {giftCount ? `${giftCount}x ` : ''}{giftName ?? text}
              </Text>
            </Text>
          </View>
          {giftCount && (
            <Text style={styles.giftCount}>x{giftCount}</Text>
          )}
        </View>
      </View>
    );
  }

  if (type === 'follow') {
    return (
      <View style={styles.wrapper}>
        <PlatformBadge platformId={platform} />
        <View style={styles.followRow}>
          <Ionicons name="person-add-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.followText}>
            <Text style={styles.username}>{username}</Text> followed you
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <PlatformBadge platformId={platform} />
      <View style={[styles.commentBox, compact && styles.commentBoxCompact]}>
        <View style={styles.commentHeader}>
          <Text style={styles.username}>{username}</Text>
          {timestamp && <Text style={styles.timestamp}>{timestamp}</Text>}
        </View>
        <Text
          style={[styles.commentText, compact && styles.commentTextCompact]}
          numberOfLines={compact ? 2 : undefined}
        >
          {text}
        </Text>
        {onReply && !compact && (
          <TouchableOpacity onPress={onReply} style={styles.replyBtn} activeOpacity={0.7}>
            <Ionicons name="return-down-forward" size={12} color={Colors.pink} />
            <Text style={styles.replyText}>Reply</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    paddingTop: 8,
  },
  commentBox: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 10,
  },
  commentBoxCompact: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  username: {
    fontFamily: 'DMSans-Bold',
    fontSize: 13,
    color: Colors.textPrimary,
  },
  timestamp: {
    fontFamily: 'DMSans-Regular',
    fontSize: 11,
    color: Colors.textMuted,
  },
  commentText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  commentTextCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
  replyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 7,
    alignSelf: 'flex-start',
  },
  replyText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: Colors.pink,
  },
  giftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,45,135,0.2)',
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 10,
  },
  giftEmoji: {
    fontSize: 20,
  },
  giftMeta: {
    flex: 1,
    gap: 2,
  },
  giftDesc: {
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  giftHighlight: {
    fontFamily: 'DMSans-Bold',
    color: Colors.pink,
  },
  giftCount: {
    fontFamily: 'Syne-Bold',
    fontSize: 14,
    color: Colors.pink,
  },
  followRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 10,
  },
  followText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
