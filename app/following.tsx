import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/themes';

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

function grad(id: string): [string, string, string] {
  return GRADIENT_POOL[id.charCodeAt(0) % GRADIENT_POOL.length];
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0] ?? '').join('').toUpperCase().slice(0, 2) || '??';
}

interface UserRow {
  id: string;
  name: string;
  handle: string;
  isLive: boolean;
}

const MOCK_FOLLOWING: UserRow[] = [
  { id: 'g1', name: 'Kira Moon', handle: '@kiramoon', isLive: true },
  { id: 'g2', name: 'PulseBeats', handle: '@pulsebeats', isLive: false },
  { id: 'g3', name: 'Vibe Master', handle: '@vibemaster', isLive: true },
  { id: 'g4', name: 'Jay Wave', handle: '@jaywave', isLive: false },
  { id: 'g5', name: 'StreamLord', handle: '@streamlord', isLive: false },
  { id: 'g6', name: 'NeonDancer', handle: '@neondancer', isLive: false },
  { id: 'g7', name: 'CodeWithLex', handle: '@codewithlex', isLive: false },
];

function UserItem({ user, index, C }: { user: UserRow; index: number; C: AppColors }) {
  const [following, setFollowing] = useState(true);
  const g = grad(user.id);

  return (
    <Animated.View entering={FadeInDown.delay(index * 45).duration(350)}>
      <View style={rowS.row}>
        <View style={rowS.avatarWrap}>
          <LinearGradient colors={g} style={rowS.avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={rowS.avatarText}>{initials(user.name)}</Text>
          </LinearGradient>
          {user.isLive && <View style={[rowS.liveDot, { borderColor: C.bg }]} />}
        </View>
        <View style={rowS.info}>
          <Text style={[rowS.name, { color: C.textPrimary }]}>{user.name}</Text>
          <Text style={[rowS.handle, { color: C.textMuted }]}>{user.handle}</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.75}
          style={[
            rowS.btn,
            following
              ? { backgroundColor: C.bgCard, borderColor: C.border, borderWidth: 1 }
              : {},
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setFollowing((v) => !v);
          }}
        >
          {!following && (
            <LinearGradient
              colors={['#FF2D87', '#7B2FFF']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          )}
          <Text style={[rowS.btnText, { color: following ? C.textSecondary : '#FFFFFF' }]}>
            {following ? 'Following' : 'Follow'}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const rowS = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 11 },
  avatarWrap: { position: 'relative', flexShrink: 0 },
  avatar: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Syne-Bold', fontSize: 16, color: '#FFFFFF' },
  liveDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#FF2D87', borderWidth: 2 },
  info: { flex: 1, gap: 1 },
  name: { fontFamily: 'DMSans-Bold', fontSize: 14 },
  handle: { fontFamily: 'DMSans-Regular', fontSize: 12 },
  btn: {
    height: 34, borderRadius: 10, paddingHorizontal: 16,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden', minWidth: 88,
  },
  btnText: { fontFamily: 'DMSans-Bold', fontSize: 13 },
});

export default function FollowingScreen() {
  const insets = useSafeAreaInsets();
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? MOCK_FOLLOWING.filter((u) => u.name.toLowerCase().includes(query.toLowerCase()) || u.handle.includes(query.toLowerCase()))
    : MOCK_FOLLOWING;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Following</Text>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{MOCK_FOLLOWING.length}</Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <View style={[styles.searchBar, { backgroundColor: C.bgCard, borderColor: C.border }]}>
          <Ionicons name="search-outline" size={16} color={C.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: C.textPrimary }]}
            placeholder="Search following"
            placeholderTextColor={C.textMuted}
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={16} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {filtered.map((user, i) => (
          <View key={user.id}>
            <UserItem user={user} index={i} C={C} />
            {i < filtered.length - 1 && <View style={[styles.divider, { backgroundColor: C.border }]} />}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 16, paddingBottom: 12,
    },
    backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    title: { fontFamily: 'Syne-ExtraBold', fontSize: 22, color: C.textPrimary, flex: 1 },
    countPill: {
      backgroundColor: C.bgCard, borderRadius: 10, borderWidth: 1, borderColor: C.border,
      paddingHorizontal: 10, paddingVertical: 4,
    },
    countText: { fontFamily: 'DMSans-Bold', fontSize: 13, color: C.textSecondary },
    searchWrap: { paddingHorizontal: 16, paddingBottom: 10 },
    searchBar: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10,
    },
    searchInput: { flex: 1, fontFamily: 'DMSans-Regular', fontSize: 14, padding: 0 },
    list: { flex: 1 },
    divider: { height: 1, marginLeft: 76 },
  });
}
