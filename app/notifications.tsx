import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { AppColors } from '@/constants/themes';
import { useApp, AppNotification } from '@/context/AppContext';
import { getPlatform } from '@/constants/platforms';

type FilterType = 'all' | AppNotification['type'];

const FILTERS: { id: FilterType; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: 'notifications-outline' },
  { id: 'gift', label: 'Gifts', icon: 'gift-outline' },
  { id: 'comment', label: 'Comments', icon: 'chatbubble-outline' },
  { id: 'follower', label: 'Followers', icon: 'person-add-outline' },
  { id: 'milestone', label: 'Milestones', icon: 'trophy-outline' },
  { id: 'system', label: 'System', icon: 'information-circle-outline' },
];

function notifIcon(type: AppNotification['type'], C: AppColors) {
  switch (type) {
    case 'gift':     return { name: 'gift-outline',                color: C.gold,          bg: C.goldDim };
    case 'comment':  return { name: 'chatbubble-outline',          color: C.pink,          bg: C.pinkDim };
    case 'follower': return { name: 'person-add-outline',          color: C.success,       bg: C.successDim };
    case 'milestone':return { name: 'trophy-outline',              color: C.viba,          bg: C.vibaDim };
    case 'system':   return { name: 'information-circle-outline',  color: C.textSecondary, bg: C.bgCard };
  }
}

function timeAgo(date: Date) {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function makeRowStyles(C: AppColors) {
  return StyleSheet.create({
    notifRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    notifRowUnread: {
      backgroundColor: C.pinkDim,
      marginHorizontal: -20,
      paddingHorizontal: 20,
    },
    unreadDot: {
      position: 'absolute',
      left: 0,
      top: 20,
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: C.pink,
    },
    notifIcon: {
      width: 42,
      height: 42,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      position: 'relative',
    },
    platformBadge: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 16,
      height: 16,
      borderRadius: 5,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: C.bg,
    },
    notifBody: { flex: 1, gap: 3 },
    notifTitle: {
      fontFamily: 'DMSans-Medium',
      fontSize: 14,
      color: C.textSecondary,
    },
    notifTitleUnread: {
      fontFamily: 'DMSans-Bold',
      color: C.textPrimary,
    },
    notifText: {
      fontFamily: 'DMSans-Regular',
      fontSize: 13,
      color: C.textSecondary,
      lineHeight: 18,
    },
    notifTime: {
      fontFamily: 'DMSans-Regular',
      fontSize: 11,
      color: C.textMuted,
    },
  });
}

function NotifRow({ item, onPress, C }: { item: AppNotification; onPress: () => void; C: AppColors }) {
  const rowStyles = useMemo(() => makeRowStyles(C), [C]);
  const icon = notifIcon(item.type, C);
  const platform = item.platform ? getPlatform(item.platform) : null;

  return (
    <TouchableOpacity
      style={[rowStyles.notifRow, !item.read && rowStyles.notifRowUnread]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {!item.read && <View style={rowStyles.unreadDot} />}
      <View style={[rowStyles.notifIcon, { backgroundColor: icon.bg }]}>
        <Ionicons name={icon.name as any} size={18} color={icon.color} />
        {platform && (
          <View style={[rowStyles.platformBadge, { backgroundColor: platform.gradient[0] as string }]}>
            <FontAwesome5 name={platform.icon} size={7} color="#FFF" solid />
          </View>
        )}
      </View>
      <View style={rowStyles.notifBody}>
        <Text style={[rowStyles.notifTitle, !item.read && rowStyles.notifTitleUnread]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={rowStyles.notifText} numberOfLines={2}>{item.body}</Text>
        <Text style={rowStyles.notifTime}>{timeAgo(item.timestamp)}</Text>
      </View>
    </TouchableOpacity>
  );
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 11,
      backgroundColor: C.bgCard,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerCenter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerTitle: {
      fontFamily: 'Syne-ExtraBold',
      fontSize: 18,
      color: C.textPrimary,
    },
    countBadge: {
      backgroundColor: C.pink,
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 2,
      minWidth: 20,
      alignItems: 'center',
    },
    countBadgeText: {
      fontFamily: 'DMSans-Bold',
      fontSize: 11,
      color: '#FFFFFF',
    },
    markAllBtn: { paddingVertical: 4, paddingHorizontal: 2 },
    markAllText: {
      fontFamily: 'DMSans-Medium',
      fontSize: 12,
      color: C.pink,
    },
    filterScroll: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: C.border },
    filterRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
    filterPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.bgCard,
    },
    filterPillActive: {
      backgroundColor: C.pink,
      borderColor: C.pink,
    },
    filterText: {
      fontFamily: 'DMSans-Medium',
      fontSize: 13,
      color: C.textMuted,
    },
    filterTextActive: { color: '#FFFFFF' },
    filterBadge: {
      backgroundColor: 'rgba(255,255,255,0.25)',
      borderRadius: 8,
      paddingHorizontal: 5,
      paddingVertical: 1,
      minWidth: 16,
      alignItems: 'center',
    },
    filterBadgeText: {
      fontFamily: 'DMSans-Bold',
      fontSize: 10,
      color: '#FFFFFF',
    },
    list: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
    empty: {
      alignItems: 'center',
      paddingTop: 80,
      gap: 12,
    },
    emptyTitle: {
      fontFamily: 'Syne-Bold',
      fontSize: 18,
      color: C.textPrimary,
    },
    emptyText: {
      fontFamily: 'DMSans-Regular',
      fontSize: 14,
      color: C.textMuted,
    },
  });
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { appNotifications, unreadCount, markAllRead, markRead } = useApp();
  const [filter, setFilter] = useState<FilterType>('all');

  const filtered = filter === 'all'
    ? appNotifications
    : appNotifications.filter((n) => n.type === filter);

  const handlePress = (n: AppNotification) => {
    Haptics.selectionAsync();
    markRead(n.id);
  };

  const handleMarkAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    markAllRead();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.View entering={FadeInDown.duration(350)} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={C.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={handleMarkAll} activeOpacity={0.7} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </Animated.View>

      <Animated.ScrollView
        entering={FadeInDown.delay(80).duration(350)}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        {FILTERS.map((f) => {
          const isActive = filter === f.id;
          const count = f.id === 'all'
            ? appNotifications.filter((n) => !n.read).length
            : appNotifications.filter((n) => n.type === f.id && !n.read).length;
          return (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterPill, isActive && styles.filterPillActive]}
              onPress={() => { setFilter(f.id); Haptics.selectionAsync(); }}
              activeOpacity={0.75}
            >
              <Ionicons
                name={f.icon as any}
                size={14}
                color={isActive ? '#FFFFFF' : C.textMuted}
              />
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{f.label}</Text>
              {count > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </Animated.ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 40).duration(300)} layout={Layout.springify()}>
            <NotifRow item={item} onPress={() => handlePress(item)} C={C} />
          </Animated.View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={40} color={C.textMuted} />
            <Text style={styles.emptyTitle}>All caught up</Text>
            <Text style={styles.emptyText}>No {filter !== 'all' ? filter : ''} notifications yet.</Text>
          </View>
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
